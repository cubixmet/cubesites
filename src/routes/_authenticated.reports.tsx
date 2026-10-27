import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter, EmptyState, PageHeader, type DateRange } from "@/components/app/common";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { buildReport, exportService, type ReportKind } from "@/services/reports";
import { siteQueries } from "@/services/sites";
import { staffQueries } from "@/services/staff";
import { can } from "@/services/core";
import { pageHead } from "@/lib/seo";

const KINDS: { v: ReportKind; label: string; owner?: boolean }[] = [
  { v: "expenses", label: "Site expenses" }, { v: "payments", label: "Client payments" }, { v: "summary", label: "Site summary" },
  { v: "categories", label: "Expense categories" }, { v: "staff", label: "Staff activity" }, { v: "storage", label: "Storage usage" },
  { v: "invoices", label: "Subscription invoices", owner: true },
];

export const Route = createFileRoute("/_authenticated/reports")({
  validateSearch: (s: Record<string, unknown>): { siteId?: string } => ({ siteId: typeof s.siteId === "string" ? s.siteId : undefined }),
  head: pageHead("Reports", "Expense, payment, staff, storage and invoice reports with PDF and Excel export."),
  component: Reports,
});

function Reports() {
  const db = useDb();
  const user = useCurrentUser();
  const search = Route.useSearch();
  const [kind, setKind] = useState<ReportKind>("expenses");
  const [range, setRange] = useState<DateRange>({ key: "all" });
  const [siteId, setSiteId] = useState(search.siteId ?? "all");
  const [type, setType] = useState("all");
  const [itemId, setItemId] = useState("all");
  const [staffId, setStaffId] = useState("all");
  const [busy, setBusy] = useState<"" | "pdf" | "xlsx">("");
  const table = useMemo(() => buildReport(db, kind, { siteId, type: type as never, itemId, staffId, from: range.from, to: range.to }), [db, kind, siteId, type, itemId, staffId, range]);
  if (!can(user, "reports")) return <EmptyState title="Reports are not enabled for you" body="Ask the owner for the “View & export reports” permission." />;
  const items = type !== "all" && type !== "payment" && type !== "expenses" ? db.items.filter((i) => i.type === type) : db.items;
  const entryFilters = kind === "expenses" || kind === "payments";

  const run = async (fmt: "pdf" | "xlsx") => {
    setBusy(fmt);
    try { if (fmt === "pdf") await exportService.pdf(table, db.account.businessName); else await exportService.excel(table); toast.success(`${fmt === "pdf" ? "PDF" : "Excel"} downloaded`); }
    catch (e) { toast.error((e as Error).message || "Export failed"); } finally { setBusy(""); }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Exports use exactly the filtered data shown below." actions={<>
        <Button variant="outline" disabled={!!busy} onClick={() => run("pdf")}>{busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileDown />} PDF</Button>
        <Button variant="outline" disabled={!!busy} onClick={() => run("xlsx")}>{busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel</Button>
      </>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as ReportKind)}><SelectTrigger className="h-10 w-[200px]" aria-label="Report"><SelectValue /></SelectTrigger><SelectContent>{KINDS.filter((k) => !k.owner || can(user, "manageStaffSites")).map((k) => <SelectItem key={k.v} value={k.v}>{k.label}</SelectItem>)}</SelectContent></Select>
        {kind !== "invoices" && kind !== "staff" && kind !== "storage" && <Select value={siteId} onValueChange={setSiteId}><SelectTrigger className="h-10 w-[200px]" aria-label="Site"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sites</SelectItem>{siteQueries.list(db).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>}
        {kind === "expenses" && <Select value={type} onValueChange={(v) => { setType(v); setItemId("all"); }}><SelectTrigger className="h-10 w-[150px]" aria-label="Entry type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="materials">Materials</SelectItem><SelectItem value="labour">Labour</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>}
        {kind === "expenses" && <Select value={itemId} onValueChange={setItemId}><SelectTrigger className="h-10 w-[200px]" aria-label="Item"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All items</SelectItem>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select>}
        {(entryFilters || kind === "staff") && <Select value={staffId} onValueChange={setStaffId}><SelectTrigger className="h-10 w-[180px]" aria-label="Staff"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All staff</SelectItem>{staffQueries.all(db).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>}
        {kind !== "invoices" && kind !== "storage" && <DateRangeFilter value={range} onChange={setRange} />}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>{table.columns.map((c) => <th key={c} className="px-3 py-2.5">{c}</th>)}</tr></thead>
          <tbody className="divide-y">
            {table.rows.length === 0 && <tr><td colSpan={table.columns.length} className="px-3 py-8 text-center text-muted-foreground">No data for these filters.</td></tr>}
            {table.rows.slice(0, 200).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 tabular">{c}</td>)}</tr>)}
          </tbody>
          {table.totals && table.rows.length > 0 && <tfoot className="bg-accent/50 font-semibold"><tr>{table.totals.map((c, j) => <td key={j} className="px-3 py-2.5 tabular">{c}</td>)}</tr></tfoot>}
        </table>
      </div>
      {table.rows.length > 200 && <p className="mt-2 text-xs text-muted-foreground">Showing first 200 of {table.rows.length} rows. Exports include all rows.</p>}
      {!can(user, "viewFinancials") && <p className="mt-2 text-xs text-muted-foreground">Amounts are hidden in screens and exports because you don't have the financial totals permission.</p>}
    </>
  );
}
