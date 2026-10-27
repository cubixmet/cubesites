import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoBadge, EmptyState, PageHeader, Panel, PanelTitle } from "@/components/app/common";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { defaultPermissions, staffQueries, staffService, type StaffInput } from "@/services/staff";
import { siteQueries } from "@/services/sites";
import { can } from "@/services/core";
import { PRICING } from "@/lib/billing";
import { formatDateTime, PERMISSION_LABEL, ROLE_LABEL } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { PERMISSION_KEYS, type User } from "@/types";

export const Route = createFileRoute("/_authenticated/staff")({
  head: pageHead("Staff", "Manage staff accounts, roles, site assignments and permissions."),
  component: Staff,
});

function Staff() {
  const db = useDb();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>();
  const [historyFor, setHistoryFor] = useState<User | null>(null);
  if (!can(user, "manageStaffSites")) return <EmptyState title="Only the owner can manage staff" />;
  const staff = staffQueries.list(db);
  const enabled = staffQueries.enabledCount(db);

  return (
    <>
      <PageHeader title="Staff" subtitle={<>{enabled} enabled · owner is free · first {PRICING.freeStaff} staff free, then ₹29/month each <DemoBadge>Demo permissions</DemoBadge></>} actions={<Button onClick={() => { setEditing(undefined); setOpen(true); }}><Plus /> Add staff</Button>} />
      {staff.length === 0 ? <EmptyState icon={<Users className="size-5" />} title="No staff yet" body="Add site managers or staff to let them record entries." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {staff.map((u) => (
            <Panel key={u.id}>
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{u.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABEL[u.role]} · {u.phone}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{u.siteIds.length} site(s) · {PERMISSION_KEYS.filter((k) => u.permissions[k]).length}/{PERMISSION_KEYS.length} permissions</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`a-${u.id}`} className="text-xs text-muted-foreground">{u.active ? "Enabled" : "Disabled"}</Label>
                  <Switch id={`a-${u.id}`} checked={u.active} onCheckedChange={async (c) => { try { await staffService.setActive(u.id, c); toast.success(`${u.name} ${c ? "enabled" : "disabled"}`); } catch (e) { toast.error((e as Error).message); } }} />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(u); setOpen(true); }}>Edit & permissions</Button>
                <Button size="sm" variant="ghost" onClick={() => setHistoryFor(u)}>Activity</Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
      <StaffDialog open={open} onOpenChange={setOpen} user={editing} />
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{historyFor?.name} — activity</DialogTitle></DialogHeader>
          {historyFor && (() => { const logs = db.activity.filter((l) => l.actorId === historyFor.id || l.targetId === historyFor.id).slice(0, 50); return logs.length ? <ul className="space-y-2 text-sm">{logs.map((l) => <li key={l.id}>{l.summary}<p className="text-xs text-muted-foreground">{formatDateTime(l.at)}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No activity yet.</p>; })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StaffDialog({ open, onOpenChange, user }: { open: boolean; onOpenChange: (o: boolean) => void; user?: User }) {
  const db = useDb();
  const sites = siteQueries.list(db);
  const blank: StaffInput = { name: "", phone: "", email: "", role: "staff", siteIds: [], permissions: defaultPermissions("staff"), active: true };
  const [f, setF] = useState<StaffInput>(blank);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setErr(""); setF(user ? { name: user.name, phone: user.phone, email: user.email, role: user.role as StaffInput["role"], siteIds: user.siteIds, permissions: user.permissions, active: user.active } : blank); } }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    try { if (user) await staffService.update(user.id, f); else await staffService.create(f); toast.success(user ? "Staff updated" : "Staff added"); onOpenChange(false); }
    catch (x) { setErr((x as Error).message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{user ? "Edit staff" : "Add staff"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label htmlFor="n">Name</Label><Input id="n" className="mt-1.5 h-11" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="p">Phone</Label><Input id="p" type="tel" className="mt-1.5 h-11" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label htmlFor="em">Email</Label><Input id="em" type="email" className="mt-1.5 h-11" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={f.role} onValueChange={(r) => setF({ ...f, role: r as StaffInput["role"], permissions: defaultPermissions(r as StaffInput["role"]) })}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="site_manager">Site Manager</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Changing role resets permissions to that role's defaults.</p>
          </div>
          <Panel className="p-3 md:p-3">
            <PanelTitle>Permissions</PanelTitle>
            <div className="space-y-2">
              {PERMISSION_KEYS.map((k) => (
                <label key={k} className="flex items-center justify-between gap-3 text-sm">
                  {PERMISSION_LABEL[k]}
                  <Switch checked={f.permissions[k]} onCheckedChange={(c) => setF({ ...f, permissions: { ...f.permissions, [k]: c } })} />
                </label>
              ))}
            </div>
          </Panel>
          <div>
            <Label>Site assignments</Label>
            <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
              {sites.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm"><Checkbox checked={f.siteIds.includes(s.id)} onCheckedChange={(c) => setF({ ...f, siteIds: c ? [...f.siteIds, s.id] : f.siteIds.filter((x) => x !== s.id) })} />{s.name} <span className="text-xs text-muted-foreground">({s.status})</span></label>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between text-sm font-medium">Account enabled<Switch checked={f.active} onCheckedChange={(c) => setF({ ...f, active: c })} /></label>
          {err && <p role="alert" className="text-sm font-medium text-destructive">{err}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
