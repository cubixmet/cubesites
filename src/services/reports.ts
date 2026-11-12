// Report builders + real PDF/Excel export from the current filtered data.
import type { DemoDB } from "@/types";
import { entryQueries, type EntryFilter } from "./entries";
import { siteQueries } from "./sites";
import { staffQueries } from "./staff";
import { mediaQueries } from "./media";
import { assertCan, can } from "./core";
import { authService } from "./auth";
import { ENTRY_TYPE_LABEL, formatBytes, formatDate } from "@/lib/format";

export type ReportKind =
  "expenses" | "payments" | "summary" | "categories" | "staff" | "storage" | "invoices";

export interface ReportTable {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  totals?: (string | number)[];
}

const rs = (p: number) => (p / 100).toFixed(2);

export const buildReport = (d: DemoDB, kind: ReportKind, f: EntryFilter): ReportTable => {
  const u = authService.currentUser();
  const fin = can(u, "viewFinancials");
  const siteName = (id: string) => siteQueries.get(d, id)?.name ?? "—";
  if (kind === "expenses" || kind === "payments") {
    const es = entryQueries.list(d, {
      ...f,
      type:
        kind === "payments"
          ? "payment"
          : f.type && f.type !== "all" && f.type !== "payment"
            ? f.type
            : "expenses",
    });
    const rows = es.map((e) => [
      formatDate(e.date),
      siteName(e.siteId),
      ENTRY_TYPE_LABEL[e.type],
      e.description,
      e.quantity ?? "",
      e.unitPricePaise != null ? rs(e.unitPricePaise) : "",
      fin ? rs(e.totalPaise) : "Hidden",
      staffQueries.name(d, e.createdBy),
    ]);
    const total = es.reduce((a, b) => a + b.totalPaise, 0);
    return {
      title: kind === "payments" ? "Client payment report" : "Site expense report",
      columns: ["Date", "Site", "Type", "Description", "Qty", "Unit (₹)", "Total (₹)", "By"],
      rows,
      totals: ["Total", "", "", `${es.length} entries`, "", "", fin ? rs(total) : "Hidden", ""],
    };
  }
  if (kind === "summary") {
    const sites = siteQueries
      .list(d)
      .filter((s) => !f.siteId || f.siteId === "all" || s.id === f.siteId);
    return {
      title: "Site summary",
      columns: ["Site", "Status", "Expenses (₹)", "Payments (₹)", "Net cash flow (₹)"],
      rows: sites.map((s) => {
        const t = siteQueries.totals(d, s.id, f.from, f.to);
        return [
          s.name,
          s.status,
          fin ? rs(t.expenses) : "Hidden",
          fin ? rs(t.payments) : "Hidden",
          fin ? rs(t.net) : "Hidden",
        ];
      }),
    };
  }
  if (kind === "categories") {
    const es = entryQueries.list(d, { ...f, type: "expenses" });
    const by = new Map<string, { n: number; t: number }>();
    es.forEach((e) => {
      const k = ENTRY_TYPE_LABEL[e.type];
      const v = by.get(k) ?? { n: 0, t: 0 };
      v.n++;
      v.t += e.totalPaise;
      by.set(k, v);
    });
    return {
      title: "Expense category breakdown",
      columns: ["Category", "Entries", "Total (₹)"],
      rows: [...by].map(([k, v]) => [k, v.n, fin ? rs(v.t) : "Hidden"]),
    };
  }
  if (kind === "staff") {
    const logs = d.activity.filter(
      (l) =>
        (!f.staffId || f.staffId === "all" || l.actorId === f.staffId) &&
        (!f.from || l.at.slice(0, 10) >= f.from) &&
        (!f.to || l.at.slice(0, 10) <= f.to),
    );
    return {
      title: "Staff activity report",
      columns: ["Date", "Staff", "Action", "Details"],
      rows: logs.map((l) => [
        formatDate(l.at),
        staffQueries.name(d, l.actorId),
        l.action,
        l.summary,
      ]),
    };
  }
  if (kind === "storage") {
    const sites = siteQueries.list(d);
    return {
      title: "Storage usage report",
      columns: ["Site", "Bills", "Photos", "Size"],
      rows: sites.map((s) => {
        const a = mediaQueries.list(d, { siteId: s.id });
        return [
          s.name,
          a.filter((x) => x.kind === "bill").length,
          a.filter((x) => x.kind === "photo").length,
          formatBytes(a.reduce((x, y) => x + y.sizeBytes, 0)),
        ];
      }),
    };
  }
  return {
    title: "Subscription invoices",
    columns: ["Invoice", "Period", "Subtotal (₹)", "Tax (₹)", "Total (₹)", "Status"],
    rows: d.invoices.map((i) => [
      i.number,
      `${formatDate(i.periodStart)} – ${formatDate(i.periodEnd)}`,
      rs(i.subtotalPaise),
      rs(i.taxPaise),
      rs(i.totalPaise),
      i.status,
    ]),
  };
};

const fileBase = (t: ReportTable) =>
  `cubosites-${t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}`;

export const exportService = {
  async pdf(t: ReportTable, business: string) {
    assertCan(authService.currentUser(), "reports");
    if (!t.rows.length) throw new Error("Nothing to export for the current filters.");
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: t.columns.length > 5 ? "landscape" : "portrait" });
    doc.setFontSize(14);
    doc.text(t.title, 14, 16);
    doc.setFontSize(9);
    doc.text(`${business} · Generated ${new Date().toLocaleString("en-IN")}`, 14, 22);
    const clean = (v: string | number) => String(v).replace(/₹/g, "Rs.");
    autoTable(doc, {
      startY: 27,
      head: [t.columns.map(clean)],
      body: t.rows.map((r) => r.map(clean)),
      foot: t.totals ? [t.totals.map(clean)] : undefined,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 110, 74] },
      footStyles: { fillColor: [232, 241, 234], textColor: 20 },
    });
    doc.save(`${fileBase(t)}.pdf`);
  },
  async excel(t: ReportTable) {
    assertCan(authService.currentUser(), "reports");
    if (!t.rows.length) throw new Error("Nothing to export for the current filters.");
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([t.columns, ...t.rows, ...(t.totals ? [t.totals] : [])]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileBase(t)}.xlsx`);
  },
};
