import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateRangeFilter,
  PageHeader,
  Money,
  type DateRange,
  type RangeKey,
} from "@/components/app/common";
import { EntryList } from "@/components/app/EntryList";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { entryQueries } from "@/services/entries";
import { siteQueries } from "@/services/sites";
import { can } from "@/services/core";
import { sumPaise } from "@/lib/money";
import { pageHead } from "@/lib/seo";

interface S {
  type?: string;
  siteId?: string;
  range?: RangeKey;
  from?: string;
  to?: string;
  q?: string;
}

export const Route = createFileRoute("/_authenticated/entries")({
  validateSearch: (s: Record<string, unknown>): S => ({
    type: typeof s.type === "string" ? s.type : undefined,
    siteId: typeof s.siteId === "string" ? s.siteId : undefined,
    range: typeof s.range === "string" ? (s.range as RangeKey) : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: pageHead(
    "Entries",
    "All expenses and client payments across your sites, with search and filters.",
  ),
  component: Entries,
});

function Entries() {
  const db = useDb();
  const user = useCurrentUser();
  const s = Route.useSearch();
  const nav = useNavigate({ from: "/entries" });
  const set = (p: Partial<S>) => nav({ search: (prev: S) => ({ ...prev, ...p }), replace: true });
  const range: DateRange = { key: s.range ?? "all", from: s.from, to: s.to };
  const entries = entryQueries.list(db, {
    type: (s.type as never) ?? "all",
    siteId: s.siteId,
    from: s.from,
    to: s.to,
    q: s.q,
  });
  const exp = sumPaise(entries.filter((e) => e.type !== "payment").map((e) => e.totalPaise));
  const pay = sumPaise(entries.filter((e) => e.type === "payment").map((e) => e.totalPaise));

  return (
    <>
      <PageHeader
        title="Entries"
        subtitle={
          can(user, "viewFinancials") ? (
            <>
              {entries.length} records · Expenses <Money paise={exp} /> · Payments{" "}
              <Money paise={pay} />
            </>
          ) : (
            `${entries.length} records`
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            placeholder="Search description"
            value={s.q ?? ""}
            onChange={(e) => set({ q: e.target.value || undefined })}
            aria-label="Search entries"
          />
        </div>
        <Select
          value={s.type ?? "all"}
          onValueChange={(v) => set({ type: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="h-10 w-[160px]" aria-label="Entry type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="expenses">All expenses</SelectItem>
            <SelectItem value="materials">Materials</SelectItem>
            <SelectItem value="labour">Labour</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
            <SelectItem value="payment">Client payments</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={s.siteId ?? "all"}
          onValueChange={(v) => set({ siteId: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="h-10 w-[200px]" aria-label="Site">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sites</SelectItem>
            {siteQueries.list(db).map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFilter
          value={range}
          onChange={(r) => set({ range: r.key, from: r.from, to: r.to })}
        />
      </div>
      <EntryList entries={entries} />
    </>
  );
}
