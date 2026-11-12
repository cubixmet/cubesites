import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteService, type SiteInput } from "@/services/sites";
import { staffService, staffQueries } from "@/services/staff";
import { billingQueries } from "@/services/account";
import { useDb } from "@/hooks/use-data";
import { formatDate, formatINR, ROLE_LABEL } from "@/lib/format";
import type { Site, SiteStatus } from "@/types";

export function SiteFormDialog({
  open,
  onOpenChange,
  site,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  site?: Site;
  onSaved?: (s?: Site) => void;
}) {
  const [f, setF] = useState<SiteInput>({ name: "", primaryPhone: "", altPhone: "", address: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setF({
        name: site?.name ?? "",
        primaryPhone: site?.primaryPhone ?? "",
        altPhone: site?.altPhone ?? "",
        address: site?.address ?? "",
      });
      setError("");
    }
  }, [open, site]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (site) {
        await siteService.update(site.id, f);
        toast.success("Site updated");
        onSaved?.(site);
      } else {
        const s = await siteService.create(f);
        toast.success(`Site “${s.name}” created`);
        onSaved?.(s);
      }
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{site ? "Edit site" : "New site"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="sn">Site name *</Label>
            <Input
              id="sn"
              className="mt-1.5 h-11"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              maxLength={80}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="sp">Primary contact number *</Label>
            <Input
              id="sp"
              type="tel"
              inputMode="tel"
              className="mt-1.5 h-11"
              value={f.primaryPhone}
              onChange={(e) => setF({ ...f, primaryPhone: e.target.value })}
              placeholder="+91"
            />
          </div>
          <div>
            <Label htmlFor="sa">Additional phone</Label>
            <Input
              id="sa"
              type="tel"
              inputMode="tel"
              className="mt-1.5 h-11"
              value={f.altPhone}
              onChange={(e) => setF({ ...f, altPhone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="sd">Address</Label>
            <Textarea
              id="sd"
              className="mt-1.5"
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
              maxLength={240}
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {site ? "Save" : "Create site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SiteStatusDialog({
  site,
  target,
  onOpenChange,
}: {
  site: Site | null;
  target: SiteStatus | null;
  onOpenChange: (o: boolean) => void;
}) {
  const db = useDb();
  const [saving, setSaving] = useState(false);
  const quote = billingQueries.reactivationQuote(db);
  const open = !!site && !!target;
  const run = async () => {
    setSaving(true);
    try {
      await siteService.setStatus(site!.id, target!);
      toast.success(target === "active" ? "Site reactivated" : `Site marked ${target}`);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target === "active"
              ? "Reactivate site"
              : target === "completed"
                ? "Mark site completed"
                : "Mark site inactive"}
          </DialogTitle>
          <DialogDescription>{site?.name}</DialogDescription>
        </DialogHeader>
        {target === "active" ? (
          <div className="space-y-2 rounded-lg bg-surface p-3 text-sm">
            <p>All previous records stay attached to this site.</p>
            <p>
              Billing period:{" "}
              <b>
                {formatDate(quote.start)} – {formatDate(quote.end)}
              </b>{" "}
              ({quote.remainingDays} days remaining)
            </p>
            {quote.free ? (
              <p className="font-semibold text-income">
                No charge — within your 3 free active sites.
              </p>
            ) : (
              <p>
                Prorated charge: ₹109 ÷ 30 × {quote.remainingDays} days ={" "}
                <b>{formatINR(quote.amount)}</b> (+ tax)
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            The site stops being billed while not active. All entries, bills and photos are kept and
            the site can be reactivated any time.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={run} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignStaffDialog({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const db = useDb();
  const staff = staffQueries.list(db);
  const [sel, setSel] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setSel(staffQueries.forSite(db, siteId).map((u) => u.id));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign staff</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {staff.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No staff yet. Add staff from the Staff page.
            </p>
          )}
          {staff.map((u) => (
            <label
              key={u.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted"
            >
              <Checkbox
                checked={sel.includes(u.id)}
                onCheckedChange={(c) =>
                  setSel((s) => (c ? [...s, u.id] : s.filter((x) => x !== u.id)))
                }
              />
              <span className="flex-1">
                <span className="font-medium">{u.name}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  · {ROLE_LABEL[u.role]}
                  {!u.active && " · disabled"}
                </span>
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await staffService.assignToSite(siteId, sel);
                toast.success("Assignments saved");
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Loader2 className="animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
