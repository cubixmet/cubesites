import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter, EmptyState, PageHeader, StatCard, type DateRange } from "@/components/app/common";
import { EntryList } from "@/components/app/EntryList";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { entryQueries } from "@/services/entries";
import { siteQueries } from "@/services/sites";
import { can } from "@/services/core";
import { formatINRShort } from "@/lib/format";
import { sumPaise } from "@/lib/money";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/payments")({
  head: pageHead("Client payments", "History of client payments received across sites, shown separately from expenses."),
  component: Payments,
});

function Payments() {
  const db = useDb();
  const user = useCurrentUser();
  const [range, setRange] = useState<DateRange>({ key: "all" });
  const [siteId, setSiteId] = useState("all");
  if (!can(user, "viewFinancials")) return <EmptyState title="Financial totals are hidden" body="Ask the owner for the “View financial totals” permission." />;
  const pays = entryQueries.list(db, { type: "payment", siteId, from: range.from, to: range.to });
  const exps = entryQueries.list(db, { type: "expenses", siteId, from: range.from, to: range.to });
  return (
    <>
      <PageHeader title="Client payments" subtitle="Payments are not linked to individual expenses." actions={can(user, "createEntries") && <Button asChild><Link to="/entry/new" search={{ type: "payment" }}><Plus /> Record payment</Link></Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={siteId} onValueChange={setSiteId}><SelectTrigger className="h-10 w-[220px]" aria-label="Site"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sites</SelectItem>{siteQueries.list(db).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Payments received" tone="income" value={formatINRShort(sumPaise(pays.map((p) => p.totalPaise)))} hint={`${pays.length} payments`} />
        <StatCard label="Expenses (same filter)" tone="expense" value={formatINRShort(sumPaise(exps.map((p) => p.totalPaise)))} hint={`${exps.length} entries`} />
      </div>
      <EntryList entries={pays} empty={<EmptyState icon={<Wallet className="size-5" />} title="No payments recorded" body="Record client payments as they come in." />} />
    </>
  );
}
