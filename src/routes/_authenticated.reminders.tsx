import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlarmClock, Bell, Check, Loader2, Plus, Trash2 } from "lucide-react";
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
import { PwaInstallBanner } from "@/components/app/PwaInstallBanner";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { reminderQueries, reminderService } from "@/services/notes";
import { siteQueries } from "@/services/sites";
import { can } from "@/services/core";
import { ensureNotificationPermission } from "@/lib/pwa";
import { formatDateTime } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import type { Reminder } from "@/types";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: pageHead(
    "Reminders",
    "Timed alarms for site work or general follow-ups — fires as device notifications.",
  ),
  validateSearch: (s: Record<string, unknown>): { siteId?: string } => ({
    siteId: typeof s.siteId === "string" ? s.siteId : undefined,
  }),
  component: RemindersPage,
});

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string) {
  const d = new Date(local);
  return d.toISOString();
}

function RemindersPage() {
  const db = useDb();
  const user = useCurrentUser();
  const { siteId: filterSite } = Route.useSearch();
  const [status, setStatus] = useState<"open" | "done" | "all">("open");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Reminder | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [siteId, setSiteId] = useState("none");
  const [loading, setLoading] = useState(false);

  const sites = siteQueries.list(db, { status: "all" });
  const reminders = useMemo(
    () => reminderQueries.list(db, { siteId: filterSite || undefined, status }),
    [db, filterSite, status],
  );

  if (!can(user, "viewSite")) return <EmptyState title="No access" />;

  const startCreate = async () => {
    const perm = await ensureNotificationPermission();
    if (perm !== "granted") {
      toast.message("Allow notifications so reminder alarms can appear on your device.");
    }
    setEdit(null);
    setTitle("");
    setBody("");
    setSiteId(filterSite || "none");
    const inHour = new Date(Date.now() + 3600_000);
    setDueLocal(toLocalInput(inHour.toISOString()));
    setOpen(true);
  };

  const startEdit = (r: Reminder) => {
    setEdit(r);
    setTitle(r.title);
    setBody(r.body);
    setSiteId(r.siteId || "none");
    setDueLocal(toLocalInput(r.dueAt));
    setOpen(true);
  };

  const save = async () => {
    setLoading(true);
    try {
      const dueAt = fromLocalInput(dueLocal);
      if (edit) {
        await reminderService.update(edit.id, {
          title,
          body,
          dueAt,
          siteId: siteId === "none" ? null : siteId,
        });
        toast.success("Reminder updated");
      } else {
        await reminderService.create({
          title,
          body,
          dueAt,
          siteId: siteId === "none" ? undefined : siteId,
        });
        toast.success(
          "Reminder set — alarm will notify at that time while the app is installed/open",
        );
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
        title="Reminders"
        subtitle="Time alarms fire as device notifications (PWA). Link to a site or keep independent."
        actions={
          <Button onClick={startCreate}>
            <Plus /> New reminder
          </Button>
        }
      />
      <PwaInstallBanner />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-10 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        {filterSite && (
          <Button asChild variant="outline" size="sm">
            <Link to="/reminders">Clear site filter</Link>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const p = await ensureNotificationPermission();
            toast.message(
              p === "granted"
                ? "Notifications enabled"
                : "Notifications blocked — enable in browser settings",
            );
          }}
        >
          <Bell /> Notification permission
        </Button>
      </div>

      {reminders.length === 0 ? (
        <EmptyState
          icon={<AlarmClock className="size-5" />}
          title="No reminders"
          body="Set an alarm for deliveries, payments, or site follow-ups."
          action={
            <Button onClick={startCreate}>
              <Plus /> New reminder
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {reminders.map((r) => {
            const overdue = !r.done && new Date(r.dueAt).getTime() <= Date.now();
            return (
              <li key={r.id}>
                <Panel className={overdue ? "border-warning/40" : undefined}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`font-semibold ${r.done ? "text-muted-foreground line-through" : ""}`}
                      >
                        {r.title}
                      </p>
                      {r.body && (
                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                          {r.body}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        <AlarmClock className="mr-1 inline size-3.5" />
                        {formatDateTime(r.dueAt)}
                        {overdue && !r.done && (
                          <span className="ml-2 font-medium text-warning">Due</span>
                        )}
                        {r.notifiedAt && <span className="ml-2">· Notified</span>}
                        {" · "}
                        {r.siteId ? (siteQueries.get(db, r.siteId)?.name ?? "Site") : "Independent"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    {!r.done && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await reminderService.update(r.id, { done: true });
                          toast.success("Marked done");
                        }}
                      >
                        <Check /> Done
                      </Button>
                    )}
                    {r.done && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await reminderService.update(r.id, { done: false });
                        }}
                      >
                        Reopen
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        await reminderService.remove(r.id);
                        toast.success("Reminder removed");
                      }}
                    >
                      <Trash2 /> Delete
                    </Button>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit ? "Edit reminder" : "New reminder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="rt">Title</Label>
              <Input
                id="rt"
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rb">Details</Label>
              <Textarea
                id="rb"
                className="mt-1.5"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rd">Alarm time</Label>
              <Input
                id="rd"
                type="datetime-local"
                className="mt-1.5"
                value={dueLocal}
                onChange={(e) => setDueLocal(e.target.value)}
              />
            </div>
            <div>
              <Label>Link to site</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={loading || !title.trim() || !dueLocal}>
              {loading && <Loader2 className="animate-spin" />}Save alarm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
