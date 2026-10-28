import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, Paperclip, Pencil, Phone, Plus, UserPlus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter, EmptyState, PageHeader, Panel, PanelTitle, StatCard, StatusBadge, type DateRange } from "@/components/app/common";
import { EntryList } from "@/components/app/EntryList";
import { PhotoGallery } from "@/components/app/PhotoGallery";
import { AssignStaffDialog, SiteFormDialog, SiteStatusDialog } from "@/components/app/SiteDialogs";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { siteQueries } from "@/services/sites";
import { entryQueries } from "@/services/entries";
import { mediaQueries } from "@/services/media";
import { staffQueries } from "@/services/staff";
import { can, visibleSiteIds } from "@/services/core";
import { ENTRY_TYPE_LABEL, formatDate, formatDateTime, formatINR, formatINRShort, ROLE_LABEL } from "@/lib/format";
import { sumPaise } from "@/lib/money";
import type { SiteStatus } from "@/types";

const SITE_TABS = ["entries", "photos", "bills", "staff", "history"] as const;
type SiteTab = (typeof SITE_TABS)[number];

export const Route = createFileRoute("/_authenticated/sites/$siteId")({
  validateSearch: (s: Record<string, unknown>): { tab?: SiteTab } => ({
    tab: SITE_TABS.includes(s.tab as SiteTab) ? (s.tab as SiteTab) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Site dashboard — Cubixmet's CubeSites" },
      {
        name: "description",
        content: "Expenses, client payments, staff, bills and progress photos for one site.",
      },
      { property: "og:site_name", content: "Cubixmet's CubeSites" },
      { property: "og:title", content: "Site dashboard — Cubixmet's CubeSites" },
      { property: "og:description", content: "Per-site bookkeeping dashboard." },
      { name: "twitter:title", content: "Site dashboard — Cubixmet's CubeSites" },
      { name: "twitter:description", content: "Per-site bookkeeping dashboard." },
    ],
  }),
  component: SiteDetail,
});

function SiteDetail() {
  const { siteId } = Route.useParams();
  const { tab: tabSearch } = Route.useSearch();
  const nav = useNavigate({ from: "/sites/$siteId" });
  const db = useDb();
  const user = useCurrentUser();
  const site = siteQueries.get(db, siteId);
  const [range, setRange] = useState<DateRange>({ key: "all" });
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(false);
  const [assign, setAssign] = useState(false);
  const [statusTo, setStatusTo] = useState<SiteStatus | null>(null);
  const entries = useMemo(() => entryQueries.list(db, { siteId, from: range.from, to: range.to, q }), [db, siteId, range, q]);
  const tab = tabSearch ?? "entries";

  if (!site || !visibleSiteIds(db, user).includes(siteId)) return <EmptyState title="Site not found" body="It may have been removed or you don't have access." action={<Button asChild variant="outline"><Link to="/sites">Back to sites</Link></Button>} />;

  const fin = can(user, "viewFinancials");
  const manage = can(user, "manageStaffSites");
  const t = siteQueries.totals(db, siteId, range.from, range.to);
  const cats = (["materials", "labour", "equipment", "other"] as const).map((k) => ({ k, v: sumPaise(entries.filter((e) => e.type === k).map((e) => e.totalPaise)) }));
  const maxCat = Math.max(1, ...cats.map((c) => c.v));
  const staff = staffQueries.forSite(db, siteId);
  const bills = mediaQueries.list(db, { siteId, kind: "bill", from: range.from, to: range.to });
  const photos = mediaQueries.list(db, { siteId, kind: "photo" });
  const hist = db.activity.filter((l) => l.siteId === siteId).slice(0, 10);

  return (
    <>
      <Link to="/sites" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Sites</Link>
      <PageHeader
        title={site.name}
        subtitle={<span className="flex flex-wrap items-center gap-x-3 gap-y-1"><StatusBadge status={site.status} /><a href={`tel:${site.primaryPhone}`} className="inline-flex items-center gap-1"><Phone className="size-3" />{site.primaryPhone}</a>{site.altPhone && <span>{site.altPhone}</span>}{site.address && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{site.address}</span>}</span>}
        actions={<>
          {site.status === "active" && can(user, "createEntries") && <><Button asChild><Link to="/entry/new" search={{ siteId }}><Plus /> Add entry</Link></Button><Button asChild variant="outline"><Link to="/entry/new" search={{ siteId, type: "payment" }}><Wallet /> Payment</Link></Button></>}
          {manage && <Button variant="outline" onClick={() => setEdit(true)}><Pencil /> Edit</Button>}
          {manage && (site.status === "active" ? <Button variant="outline" onClick={() => setStatusTo("completed")}>Mark completed</Button> : <Button variant="soft" onClick={() => setStatusTo("active")}>Reactivate</Button>)}
        </>}
      />
      {site.status !== "active" && <p className="mb-4 rounded-lg border bg-surface p-3 text-sm">This site is <b>{site.status}</b>. History is preserved; reactivate to add new entries.</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2"><DateRangeFilter value={range} onChange={setRange} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Expenses" value={fin ? formatINRShort(t.expenses) : "••••"} tone="expense" />
        <StatCard label="Payments received" value={fin ? formatINRShort(t.payments) : "••••"} tone="income" />
        <div className="col-span-2 lg:col-span-1"><StatCard label="Net recorded cash flow" value={fin ? formatINRShort(t.net) : "••••"} tone={t.net >= 0 ? "income" : "expense"} hint="Not profit — payments minus recorded expenses" /></div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => nav({ search: { tab: v === "entries" ? undefined : (v as SiteTab) }, replace: true })}
        className="mt-5"
      >
        <TabsList className="h-11 w-full max-w-full justify-start overflow-x-auto overscroll-x-contain">
          <TabsTrigger value="entries">Transactions</TabsTrigger>
          <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
          <TabsTrigger value="bills">Bills ({bills.length})</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="mt-4 grid gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <Input className="mb-3 h-10" placeholder="Search transactions" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search transactions" />
            <EntryList entries={entries} showSite={false} />
          </div>
          {fin && (
            <Panel>
              <PanelTitle>Expense categories</PanelTitle>
              <ul className="space-y-3">
                {cats.map((c) => (
                  <li key={c.k}>
                    <div className="flex justify-between text-sm"><span>{ENTRY_TYPE_LABEL[c.k]}</span><span className="font-semibold tabular">{formatINR(c.v)}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(c.v / maxCat) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
              {can(user, "reports") && <Button asChild variant="outline" className="mt-4 w-full"><Link to="/reports" search={{ siteId }}>Open site report</Link></Button>}
            </Panel>
          )}
        </TabsContent>
        <TabsContent value="photos" className="mt-4"><PhotoGallery siteId={siteId} allowUpload={site.status === "active"} /></TabsContent>
        <TabsContent value="bills" className="mt-4">
          {bills.length === 0 ? <EmptyState icon={<Paperclip className="size-5" />} title="No bill images" body="Attach bills when adding entries." /> : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {bills.map((b) => {
                const e = b.entryId ? entryQueries.get(db, b.entryId) : undefined;
                return (
                  <a key={b.id} href={b.src} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border bg-card">
                    <img src={b.src} alt={b.name} className="aspect-[3/4] w-full object-cover" loading="lazy" />
                    <p className="truncate px-2 py-1 text-[11px]">{e?.description ?? b.name}</p>
                    <p className="px-2 pb-1 text-[11px] text-muted-foreground">{formatDate(b.date)}</p>
                  </a>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="staff" className="mt-4">
          <Panel>
            <PanelTitle action={manage && <Button size="sm" variant="outline" onClick={() => setAssign(true)}><UserPlus /> Assign staff</Button>}>Assigned staff</PanelTitle>
            {staff.length === 0 ? <p className="text-sm text-muted-foreground">No staff assigned. The owner always has access.</p> : (
              <ul className="divide-y">{staff.map((u) => <li key={u.id} className="flex justify-between py-2.5 text-sm"><span className="font-medium">{u.name}</span><span className="text-muted-foreground">{ROLE_LABEL[u.role]}{!u.active && " · disabled"}</span></li>)}</ul>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <Panel>
            <PanelTitle>Lifecycle</PanelTitle>
            <ul className="mb-4 space-y-1 text-sm">{site.statusHistory.map((h, i) => <li key={i}><StatusBadge status={h.status} /> <span className="text-muted-foreground">{formatDateTime(h.at)} · {staffQueries.name(db, h.by)}</span></li>)}</ul>
            <PanelTitle>Recent activity</PanelTitle>
            <ul className="space-y-2 text-sm">{hist.map((l) => <li key={l.id}>{l.summary} <span className="text-xs text-muted-foreground">· {formatDateTime(l.at)}</span></li>)}</ul>
          </Panel>
        </TabsContent>
      </Tabs>

      <SiteFormDialog open={edit} onOpenChange={setEdit} site={site} />
      <SiteStatusDialog site={statusTo ? site : null} target={statusTo} onOpenChange={(o) => !o && setStatusTo(null)} />
      <AssignStaffDialog siteId={siteId} open={assign} onOpenChange={setAssign} />
    </>
  );
}
