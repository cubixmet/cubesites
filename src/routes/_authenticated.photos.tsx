import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Images } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/app/common";
import { useDb } from "@/hooks/use-data";
import { mediaQueries } from "@/services/media";
import { siteQueries } from "@/services/sites";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/photos")({
  head: pageHead("Progress photos", "Progress photos live on each site. Pick a site to open its Photos tab."),
  component: Photos,
});

function Photos() {
  const db = useDb();
  const sites = siteQueries.list(db);
  return (
    <>
      <PageHeader title="Progress photos" subtitle="Photos are kept per site. Open a site’s Photos tab to view or upload." />
      {sites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sites yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {sites.map((s) => {
            const count = mediaQueries.list(db, { siteId: s.id, kind: "photo" }).length;
            return (
              <li key={s.id}>
                <Link
                  to="/sites/$siteId"
                  params={{ siteId: s.id }}
                  search={{ tab: "photos" }}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-muted"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground"><Images className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">{s.name} <StatusBadge status={s.status} /></span>
                    <span className="block text-xs text-muted-foreground">{count} photo{count === 1 ? "" : "s"}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
