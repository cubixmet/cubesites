import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import type { SiteStatus } from "@/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isoDaysAgo, todayISO } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground md:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-xl border bg-card p-4 shadow-card md:p-5", className)}>{children}</section>;
}

export function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "default", to, search }: { label: string; value: string; hint?: string; tone?: "default" | "income" | "expense"; to?: string; search?: Record<string, string> }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-xl font-semibold tabular md:text-2xl", tone === "income" && "text-income", tone === "expense" && "text-expense")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl border bg-card p-4 shadow-card transition-colors";
  if (to) return <Link to={to} search={search as never} className={cn(cls, "hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>{body}</Link>;
  return <div className={cls}>{body}</div>;
}

export function Money({ paise, signed, className }: { paise: number; signed?: boolean; className?: string }) {
  return <span className={cn("tabular", signed && (paise >= 0 ? "text-income" : "text-expense"), className)}>{signed && paise > 0 ? "+" : ""}{formatINR(paise)}</span>;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-surface px-6 py-10 text-center">
      {icon && <div className="mb-3 rounded-full bg-accent p-3 text-accent-foreground">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const STATUS_CLS: Record<SiteStatus, string> = {
  active: "bg-accent text-accent-foreground",
  completed: "bg-secondary text-secondary-foreground",
  inactive: "bg-muted text-muted-foreground",
};
export function StatusBadge({ status }: { status: SiteStatus }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_CLS[status])}>{status}</span>;
}

export function DemoBadge({ children = "Demo only" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">{children}</span>;
}

export type RangeKey = "7" | "30" | "90" | "all" | "custom";
export interface DateRange { key: RangeKey; from?: string; to?: string }
export const rangeFromKey = (key: RangeKey, cur?: DateRange): DateRange =>
  key === "all" ? { key } : key === "custom" ? { key, from: cur?.from ?? isoDaysAgo(30), to: cur?.to ?? todayISO() } : { key, from: isoDaysAgo(Number(key) - 1), to: todayISO() };

export function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.key} onValueChange={(k) => onChange(rangeFromKey(k as RangeKey, value))}>
        <SelectTrigger className="h-10 w-[150px]" aria-label="Date range"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="custom">Custom…</SelectItem>
        </SelectContent>
      </Select>
      {value.key === "custom" && (
        <>
          <Input type="date" aria-label="From" className="h-10 w-[150px]" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          <Input type="date" aria-label="To" className="h-10 w-[150px]" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </>
      )}
    </div>
  );
}
