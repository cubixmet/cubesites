import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader } from "@/components/app/common";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { staffQueries } from "@/services/staff";
import { siteQueries } from "@/services/sites";
import { visibleSiteIds } from "@/services/core";
import { formatDateTime } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/activity")({
  head: pageHead("Activity log", "Who changed what and when — with before and after values."),
  component: ActivityPage,
});

const fmt = (o?: Record<string, unknown>) => (o ? Object.entries(o).map(([k, v]) => `${k}: ${v ?? "—"}`).join(", ") : "");

function ActivityPage() {
  const db = useDb();
  const user = useCurrentUser();
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [limit, setLimit] = useState(40);
  const ids = new Set(visibleSiteIds(db, user));
  const logs = db.activity.filter((l) => (user?.role === "owner" || (l.siteId ? ids.has(l.siteId) : l.actorId === user?.id)) && (actor === "all" || l.actorId === actor) && (action === "all" || l.action === action));
  return (
    <>
      <PageHeader title="Activity log" subtitle={`${logs.length} events`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={actor} onValueChange={setActor}><SelectTrigger className="h-10 w-[180px]" aria-label="Actor"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Everyone</SelectItem>{staffQueries.all(db).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
        <Select value={action} onValueChange={setAction}><SelectTrigger className="h-10 w-[160px]" aria-label="Action"><SelectValue /></SelectTrigger><SelectContent>{["all", "create", "update", "delete", "deactivate", "reactivate", "complete", "login"].map((a) => <SelectItem key={a} value={a} className="capitalize">{a === "all" ? "All actions" : a}</SelectItem>)}</SelectContent></Select>
      </div>
      {logs.length === 0 ? <EmptyState title="No activity" /> : (
        <ul className="divide-y rounded-xl border bg-card">
          {logs.slice(0, limit).map((l) => (
            <li key={l.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-medium">{l.summary}</p><span className="text-xs text-muted-foreground">{formatDateTime(l.at)}</span></div>
              <p className="text-xs text-muted-foreground">{staffQueries.name(db, l.actorId)} · <span className="capitalize">{l.action}</span> · {l.targetType}{l.siteId && ` · ${siteQueries.get(db, l.siteId)?.name ?? "—"}`}</p>
              {(l.before || l.after) && <p className="mt-1 rounded bg-surface px-2 py-1 font-mono text-[11px]">{l.before && <>before {fmt(l.before)}</>}{l.before && l.after && " → "}{l.after && <>after {fmt(l.after)}</>}</p>}
            </li>
          ))}
        </ul>
      )}
      {logs.length > limit && <div className="mt-3 text-center"><Button variant="outline" onClick={() => setLimit((x) => x + 40)}>Load more</Button></div>}
    </>
  );
}
