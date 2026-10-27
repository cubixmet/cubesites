import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, HardDrive, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter, EmptyState, Panel, PanelTitle, PageHeader, StatCard, StatusBadge, rangeFromKey, type DateRange } from "@/components/app/common";
import { EntryList } from "@/components/app/EntryList";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { siteQueries } from "@/services/sites";
import { entryQueries } from "@/services/entries";
import { billingQueries } from "@/services/account";
import { staffQueries } from "@/services/staff";
import { can } from "@/services/core";
import { formatDateTime, formatINR, formatINRShort } from "@/lib/format";
import { sumPaise } from "@/lib/money";
import { pageHead } from "@/lib/seo";
import type { SiteStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: pageHead("Dashboard", "Overview of active sites, expenses, client payments and net recorded cash flow."),
  component: Dashboard,
});

function Dashboard() {
  const db = useDb();
  const user = useCurrentUser();
  const fin = can(user, "viewFinancials");
  const [range, setRange] = useState<DateRange>(rangeFromKey("30"));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SiteStatus | "all">("active");
  const allSites = siteQueries.list(db);
  const sites = siteQueries.list(db, { q, status });
  const entries = useMemo(() => entryQueries.list(db, { from: range.from, to: range.to }), [db, range]);
  const expenses = sumPaise(entries.filter((e) => e.type !== "payment").map((e) => e.totalPaise));
  const payments = sumPaise(entries.filter((e) => e.type === "payment").map((e) => e.totalPaise));
  const bill = billingQueries.current(db);
  const visible = new Set(allSites.map((s) => s.id));
  const activity = db.activity.filter((l) => !l.siteId || visible.has(l.siteId)).slice(0, 6);
  const rangeSearch: Record<string, string> = { range: range.key, ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) };
  const hidden = "••••";

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.name.split(" ")[0]}`}
        subtitle={db.account.businessName}
        actions={<><DateRangeFilter value={range} onChange={setRange} />{can(user, "createEntries") && <Button asChild><Link to="/entry/new"><Plus /> Add entry</Link></Button>}</>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active sites" value={String(allSites.filter((s) => s.status === "active").length)} hint={`${allSites.length} total`} to="/sites" />
        <StatCard label="Expenses" value={fin ? formatINRShort(expenses) : hidden} tone="expense" hint={`${entries.filter((e) => e.type !== "payment").length} entries`} to="/entries" search={{ ...rangeSearch, type: "expenses" }} />
        <StatCard label="Payments received" value={fin ? formatINRShort(payments) : hidden} tone="income" hint={`${entries.filter((e) => e.type === "payment").length} payments`} to="/entries" search={{ ...rangeSearch, type: "payment" }} />
        <StatCard label="Net recorded cash flow" value={fin ? formatINRShort(payments - expenses) : hidden} tone={payments - expenses >= 0 ? "income" : "expense"} hint="Payments − expenses (not profit)" to="/entries" search={rangeSearch} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel>
            <PanelTitle action={<Link to="/sites" className="text-sm font-semibold text-primary">All sites</Link>}>Sites</PanelTitle>
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-10 pl-9" placeholder="Search sites" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sites" /></div>
              <Select value={status} onValueChange={(v) => setStatus(v as SiteStatus | "all")}><SelectTrigger className="h-10 w-[130px]" aria-label="Status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
            </div>
            {sites.length === 0 ? (
              <EmptyState icon={<Building2 className="size-5" />} title={allSites.length ? "No sites match" : "No sites yet"} body={allSites.length ? "Change the search or status filter." : "Create your first site to start recording entries."} action={!allSites.length && can(user, "manageStaffSites") ? <Button asChild><Link to="/sites">Create site</Link></Button> : undefined} />
            ) : (
              <ul className="divide-y">
                {sites.slice(0, 6).map((s) => {
                  const t = siteQueries.totals(db, s.id, range.from, range.to);
                  return (
                    <li key={s.id}>
                      <Link to="/sites/$siteId" params={{ siteId: s.id }} className="flex items-center gap-3 rounded-lg px-1 py-3 hover:bg-muted/60">
                        <div className="min-w-0 flex-1"><p className="truncate font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{t.count} entries in range</p></div>
                        <StatusBadge status={s.status} />
                        <span className={`w-28 text-right text-sm font-semibold tabular ${t.net >= 0 ? "text-income" : "text-expense"}`}>{fin ? formatINRShort(t.net) : hidden}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <div>
            <PanelTitle action={<Link to="/entries" className="text-sm font-semibold text-primary">View all</Link>}>Recent entries</PanelTitle>
            <EntryList entries={entries.slice(0, 8)} empty={<EmptyState title="No entries in this period" body="Add an entry or widen the date range." action={can(user, "createEntries") ? <Button asChild><Link to="/entry/new"><Plus /> Add entry</Link></Button> : undefined} />} />
          </div>
        </div>
        <div className="space-y-5">
          <Panel>
            <PanelTitle>Recent site activity</PanelTitle>
            {activity.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
              <ul className="space-y-3">
                {activity.map((l) => (
                  <li key={l.id} className="text-sm"><p>{l.summary}</p><p className="text-xs text-muted-foreground">{staffQueries.name(db, l.actorId)} · {formatDateTime(l.at)}</p></li>
                ))}
              </ul>
            )}
            <Link to="/activity" className="mt-3 inline-block text-sm font-semibold text-primary">Full activity log</Link>
          </Panel>
          <Panel>
            <PanelTitle>Storage & plan</PanelTitle>
            <div className="flex items-center gap-2 text-sm"><HardDrive className="size-4 text-muted-foreground" /> {bill.avgMB.toFixed(1)} MB avg this period</div>
            <Progress value={Math.min(100, (bill.avgMB / 250) * 100)} className="mt-2 h-2" />
            <p className="mt-1 text-xs text-muted-foreground">250 MB free · {bill.storage.blocks} billable block(s)</p>
            {can(user, "manageStaffSites") ? (
              <div className="mt-4 rounded-lg bg-surface p-3 text-sm">
                <p className="font-semibold">Estimated this period: {formatINR(bill.total)}</p>
                <p className="text-xs text-muted-foreground">{bill.activeSites} active sites · {bill.enabledStaff} staff enabled</p>
                <Link to="/subscription" className="mt-2 inline-block text-sm font-semibold text-primary">View subscription</Link>
              </div>
            ) : <p className="mt-3 text-xs text-muted-foreground">Plan details are visible to the owner.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
