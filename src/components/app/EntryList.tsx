import { useState } from "react";
import { Paperclip, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { can } from "@/services/core";
import { entryService } from "@/services/entries";
import { siteQueries } from "@/services/sites";
import { staffQueries } from "@/services/staff";
import { mediaQueries } from "@/services/media";
import { ENTRY_TYPE_LABEL, formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Entry } from "@/types";
import { EntryForm } from "./EntryForm";
import { EmptyState } from "./common";

const PAGE = 20;

export function EntryList({ entries, showSite = true, empty }: { entries: Entry[]; showSite?: boolean; empty?: React.ReactNode }) {
  const db = useDb();
  const user = useCurrentUser();
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [viewing, setViewing] = useState<Entry | null>(null);
  const fin = can(user, "viewFinancials");
  const canEdit = can(user, "editEntries");

  if (!entries.length) return <>{empty ?? <EmptyState title="No entries found" body="Try a different date range or filter." />}</>;

  const amount = (e: Entry) => (fin ? formatINR(e.totalPaise) : "••••");
  const shown = entries.slice(0, limit);

  return (
    <>
      <ul className="divide-y rounded-xl border bg-card">
        {shown.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-3 py-3 md:px-4">
            <button type="button" onClick={() => setViewing(e)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              <p className="truncate font-medium">{e.description}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{formatDate(e.date)}</span>
                <span className={cn("font-semibold", e.type === "payment" ? "text-income" : "")}>{ENTRY_TYPE_LABEL[e.type]}</span>
                {showSite && <span className="truncate">· {siteQueries.get(db, e.siteId)?.name}</span>}
                {e.quantity != null && <span>· {e.quantity} × {fin && e.unitPricePaise != null ? formatINR(e.unitPricePaise) : ""}</span>}
                {e.attachmentIds.length > 0 && <span className="inline-flex items-center gap-0.5"><Paperclip className="size-3" />{e.attachmentIds.length}</span>}
              </p>
            </button>
            <span className={cn("shrink-0 font-semibold tabular", e.type === "payment" ? "text-income" : "text-foreground")}>{e.type === "payment" ? "+" : ""}{amount(e)}</span>
            {canEdit && (
              <div className="hidden shrink-0 gap-1 sm:flex">
                <Button size="icon" variant="ghost" aria-label="Edit entry" onClick={() => setEditing(e)}><Pencil /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete entry" onClick={() => setDeleting(e)}><Trash2 /></Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {entries.length > limit && (
        <div className="mt-3 text-center"><Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>Show more ({entries.length - limit} remaining)</Button></div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader><DialogTitle>{viewing.description}</DialogTitle></DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Type</dt><dd className="font-medium">{ENTRY_TYPE_LABEL[viewing.type]}</dd></div>
                <div><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{formatDate(viewing.date)}</dd></div>
                <div><dt className="text-muted-foreground">Site</dt><dd className="font-medium">{siteQueries.get(db, viewing.siteId)?.name}</dd></div>
                <div><dt className="text-muted-foreground">Recorded by</dt><dd className="font-medium">{staffQueries.name(db, viewing.createdBy)}</dd></div>
                {viewing.quantity != null && <div><dt className="text-muted-foreground">Quantity</dt><dd className="font-medium">{viewing.quantity}</dd></div>}
                {viewing.unitPricePaise != null && <div><dt className="text-muted-foreground">Unit price</dt><dd className="font-medium">{fin ? formatINR(viewing.unitPricePaise) : "••••"}</dd></div>}
                <div><dt className="text-muted-foreground">Total</dt><dd className="text-lg font-semibold">{amount(viewing)}</dd></div>
              </dl>
              {viewing.attachmentIds.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaQueries.byIds(db, viewing.attachmentIds).map((a) => (
                    <a key={a.id} href={a.src} target="_blank" rel="noreferrer"><img src={a.src} alt={a.name} className="aspect-square w-full rounded-lg border object-cover" /></a>
                  ))}
                </div>
              )}
              {canEdit && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setEditing(viewing); setViewing(null); }}><Pencil /> Edit</Button>
                  <Button variant="outline" className="flex-1 text-destructive" onClick={() => { setDeleting(viewing); setViewing(null); }}><Trash2 /> Delete</Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit entry</DialogTitle></DialogHeader>
          {editing && <EntryForm entry={editing} onSaved={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.description}” ({deleting && amount(deleting)}) and its bill images will be removed. The deletion is recorded in the activity log.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { try { await entryService.remove(deleting!.id); toast.success("Entry deleted"); } catch (e) { toast.error((e as Error).message); } setDeleting(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
