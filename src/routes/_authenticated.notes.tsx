import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, PageHeader, Panel } from "@/components/app/common";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { noteQueries, noteService } from "@/services/notes";
import { siteQueries } from "@/services/sites";
import { can } from "@/services/core";
import { formatDateTime } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import type { Note } from "@/types";

export const Route = createFileRoute("/_authenticated/notes")({
  head: pageHead("Notes", "Workspace notes — linked to a site or kept independent."),
  validateSearch: (s: Record<string, unknown>): { siteId?: string } => ({
    siteId: typeof s.siteId === "string" ? s.siteId : undefined,
  }),
  component: NotesPage,
});

function NotesPage() {
  const db = useDb();
  const user = useCurrentUser();
  const { siteId: filterSite } = Route.useSearch();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [siteId, setSiteId] = useState<string>("none");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const sites = siteQueries.list(db, { status: "all" });
  const notes = useMemo(
    () => noteQueries.list(db, { siteId: filterSite || undefined, q }),
    [db, filterSite, q],
  );

  if (!can(user, "viewSite")) return <EmptyState title="No access" />;

  const startCreate = () => {
    setEdit(null);
    setTitle("");
    setBody("");
    setSiteId(filterSite || "none");
    setPinned(false);
    setOpen(true);
  };

  const startEdit = (n: Note) => {
    setEdit(n);
    setTitle(n.title);
    setBody(n.body);
    setSiteId(n.siteId || "none");
    setPinned(n.pinned);
    setOpen(true);
  };

  const save = async () => {
    setLoading(true);
    try {
      if (edit) {
        await noteService.update(edit.id, {
          title,
          body,
          pinned,
          siteId: siteId === "none" ? null : siteId,
        });
        toast.success("Note updated");
      } else {
        await noteService.create({
          title,
          body,
          pinned,
          siteId: siteId === "none" ? undefined : siteId,
        });
        toast.success("Note saved");
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Notes"
        subtitle="Pin site tips or keep general workspace notes."
        actions={
          <Button onClick={startCreate}>
            <Plus /> New note
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="h-10 max-w-xs"
          placeholder="Search notes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {filterSite && (
          <Button asChild variant="outline" size="sm">
            <Link to="/notes">Clear site filter</Link>
          </Button>
        )}
      </div>

      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          body="Add a note for a site or keep it independent of any site."
          action={
            <Button onClick={startCreate}>
              <Plus /> New note
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id}>
              <Panel className="cursor-pointer hover:border-primary/30">
                <button type="button" className="w-full text-left" onClick={() => startEdit(n)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {n.pinned && <Pin className="mr-1 inline size-3.5 text-primary" />}
                        {n.title}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">
                        {n.body || "—"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {n.siteId ? (siteQueries.get(db, n.siteId)?.name ?? "Site") : "Independent"}{" "}
                        · {formatDateTime(n.updatedAt)}
                      </p>
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Button size="sm" variant="outline" onClick={() => startEdit(n)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={async () => {
                      try {
                        await noteService.remove(n.id);
                        toast.success("Note deleted");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit ? "Edit note" : "New note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="nt">Title</Label>
              <Input
                id="nt"
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nb">Details</Label>
              <Textarea
                id="nb"
                className="mt-1.5 min-h-28"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div>
              <Label>Link to site</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Independent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Independent (no site)</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Pin to top
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={loading || !title.trim()}>
              {loading && <Loader2 className="animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
