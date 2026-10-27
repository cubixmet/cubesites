import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/common";
import { PhotoGallery } from "@/components/app/PhotoGallery";
import { useDb } from "@/hooks/use-data";
import { siteQueries } from "@/services/sites";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/photos")({
  head: pageHead("Progress photos", "Chronological construction progress photos for every site."),
  component: Photos,
});

function Photos() {
  const db = useDb();
  const sites = siteQueries.list(db);
  const [siteId, setSiteId] = useState("all");
  const site = sites.find((s) => s.id === siteId);
  return (
    <>
      <PageHeader title="Progress photos" subtitle="Separate from bill attachments. Pick a site to upload." actions={
        <Select value={siteId} onValueChange={setSiteId}><SelectTrigger className="h-10 w-[240px]" aria-label="Site"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sites</SelectItem>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
      } />
      <PhotoGallery key={siteId} siteId={site?.status === "active" ? site.id : siteId === "all" ? undefined : undefined} showSite={siteId === "all"} />
    </>
  );
}
