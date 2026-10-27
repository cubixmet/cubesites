import { createFileRoute, Link } from "@tanstack/react-router";
import { EntryForm } from "@/components/app/EntryForm";
import { EmptyState, PageHeader, Panel } from "@/components/app/common";
import { useCurrentUser } from "@/hooks/use-data";
import { can } from "@/services/core";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import type { EntryType } from "@/types";

const TYPES = ["materials", "labour", "equipment", "other", "payment"];

export const Route = createFileRoute("/_authenticated/entry/new")({
  validateSearch: (s: Record<string, unknown>): { siteId?: string; type?: EntryType } => ({
    siteId: typeof s.siteId === "string" ? s.siteId : undefined,
    type: typeof s.type === "string" && TYPES.includes(s.type) ? (s.type as EntryType) : undefined,
  }),
  head: pageHead("New entry", "Quickly record a material, labour, equipment or other expense, or a client payment."),
  component: NewEntry,
});

function NewEntry() {
  const user = useCurrentUser();
  const s = Route.useSearch();
  if (!can(user, "createEntries")) return <EmptyState title="You can't create entries" body="Ask the owner to enable the “Create entries” permission." action={<Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>} />;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New entry" subtitle="Your last selected site is remembered." />
      <Panel><EntryForm initialSiteId={s.siteId} initialType={s.type} /></Panel>
    </div>
  );
}
