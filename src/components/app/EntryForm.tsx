import { useMemo, useState } from "react";
import { Loader2, Package, HardHat, Truck, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDb } from "@/hooks/use-data";
import { siteQueries } from "@/services/sites";
import { entryService, type EntryInput } from "@/services/entries";
import { mediaQueries } from "@/services/media";
import { ItemCombobox } from "./ItemCombobox";
import { AttachmentPicker } from "./AttachmentPicker";
import { paiseToInput, parseQty, toPaise, totalFrom, unitFrom } from "@/lib/money";
import { formatINR, todayISO } from "@/lib/format";
import type { Attachment, Entry, EntryType } from "@/types";

const TYPES: { v: EntryType; label: string; icon: typeof Package }[] = [
  { v: "materials", label: "Materials", icon: Package },
  { v: "labour", label: "Labour", icon: HardHat },
  { v: "equipment", label: "Equipment", icon: Truck },
  { v: "other", label: "Other", icon: Receipt },
  { v: "payment", label: "Payment in", icon: Wallet },
];

export function EntryForm({ initialSiteId, initialType, entry, onSaved }: { initialSiteId?: string; initialType?: EntryType; entry?: Entry; onSaved?: (e?: Entry) => void }) {
  const db = useDb();
  const sites = useMemo(() => siteQueries.list(db, { status: "active" }), [db]);
  const allSites = useMemo(() => siteQueries.list(db), [db]);
  const remembered = db.prefs.lastSiteId && sites.some((s) => s.id === db.prefs.lastSiteId) ? db.prefs.lastSiteId : sites[0]?.id;

  const [siteId, setSiteId] = useState(entry?.siteId ?? initialSiteId ?? remembered ?? "");
  const [type, setType] = useState<EntryType>(entry?.type ?? initialType ?? "materials");
  const [itemId, setItemId] = useState<string | undefined>(entry?.itemId);
  const [itemName, setItemName] = useState(entry && entry.type !== "payment" ? entry.description : "");
  const [description, setDescription] = useState(entry?.type === "payment" ? entry.description : "");
  const [qty, setQty] = useState(entry?.quantity != null ? String(entry.quantity) : "");
  const [unit, setUnit] = useState(paiseToInput(entry?.unitPricePaise));
  const [total, setTotal] = useState(entry ? paiseToInput(entry.totalPaise) : "");
  const [lastPrice, setLastPrice] = useState<"unit" | "total">(entry?.unitPricePaise != null ? "unit" : "total");
  const [date, setDate] = useState(entry?.date ?? todayISO());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const existing = entry ? mediaQueries.byIds(db, entry.attachmentIds) : [];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isPayment = type === "payment";
  const qtyN = parseQty(qty);

  const onQty = (v: string) => {
    setQty(v);
    const q = parseQty(v);
    if (q == null || q === 0) return;
    if (lastPrice === "unit") { const u = toPaise(unit); if (u != null) setTotal(paiseToInput(totalFrom(q, u))); }
    else { const t = toPaise(total); if (t != null) { const u = unitFrom(q, t); if (u != null) setUnit(paiseToInput(u)); } }
  };
  const onUnit = (v: string) => {
    setUnit(v); setLastPrice("unit");
    const u = toPaise(v);
    if (qtyN && u != null) setTotal(paiseToInput(totalFrom(qtyN, u)));
  };
  const onTotal = (v: string) => {
    setTotal(v); setLastPrice("total");
    const t = toPaise(v);
    if (qtyN && t != null) { const u = unitFrom(qtyN, t); if (u != null) setUnit(paiseToInput(u)); }
  };

  const changeType = (t: EntryType) => {
    if (t === type) return;
    setType(t); setItemId(undefined); setItemName("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!siteId) errs.site = "Select a site.";
    if (!isPayment && !itemId) errs.item = "Select or add an item.";
    if (isPayment && !description.trim()) errs.description = "Add a description or reference.";
    if (!isPayment && qty && qtyN == null) errs.qty = "Enter a valid quantity (up to 3 decimals).";
    if (!isPayment && qty && qtyN === 0) errs.qty = "Quantity can't be zero.";
    if (!isPayment && unit && toPaise(unit) == null) errs.unit = "Enter a valid price.";
    const t = toPaise(total);
    if (t == null || t <= 0) errs.total = "Enter an amount greater than zero.";
    if (!date) errs.date = "Select a date.";
    if (date > todayISO()) errs.date = "Date can't be in the future.";
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields."); return; }
    const input: EntryInput = {
      siteId, type, itemId: isPayment ? undefined : itemId,
      description: isPayment ? description : itemName,
      quantity: isPayment || qtyN == null ? undefined : qtyN,
      unitPricePaise: isPayment || qtyN == null || !unit ? undefined : toPaise(unit)!,
      totalPaise: t!, date,
      attachmentIds: [...(entry?.attachmentIds ?? []), ...attachments.map((a) => a.id)],
    };
    setSaving(true);
    try {
      if (entry) { await entryService.update(entry.id, input); toast.success("Entry updated"); onSaved?.(); }
      else {
        const saved = await entryService.create(input);
        toast.success(`Saved ${formatINR(saved.totalPaise)} · ${saved.description}`);
        setItemId(undefined); setItemName(""); setDescription(""); setQty(""); setUnit(""); setTotal(""); setAttachments([]); setErrors({});
        onSaved?.(saved);
      }
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  };

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs font-medium text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="site">Site</Label>
        <Select value={siteId} onValueChange={setSiteId} disabled={!!entry}>
          <SelectTrigger id="site" className={cn("mt-1.5 h-12 text-base", errors.site && "border-destructive")}><SelectValue placeholder="Select a site" /></SelectTrigger>
          <SelectContent>{(entry ? allSites : sites).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        {sites.length === 0 && !entry && <p className="mt-1 text-xs text-muted-foreground">No active sites available. Create or reactivate a site first.</p>}
        {err("site")}
      </div>

      <div>
        <Label>Entry type</Label>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5" role="radiogroup">
          {TYPES.map(({ v, label, icon: Icon }) => (
            <button key={v} type="button" role="radio" aria-checked={type === v} disabled={!!entry && (v === "payment") !== (entry.type === "payment")} onClick={() => changeType(v)}
              className={cn("flex flex-col items-center gap-1 rounded-lg border px-1 py-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 sm:text-xs",
                type === v ? (v === "payment" ? "border-income bg-income/10 text-income" : "border-primary bg-accent text-accent-foreground") : "bg-card text-muted-foreground hover:bg-muted")}>
              <Icon className="size-5" />{label}
            </button>
          ))}
        </div>
      </div>

      {isPayment ? (
        <>
          <div>
            <Label htmlFor="desc">Description / reference</Label>
            <Textarea id="desc" className={cn("mt-1.5 text-base", errors.description && "border-destructive")} placeholder="e.g. Stage payment, NEFT ref…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
            {err("description")}
          </div>
          <div>
            <Label htmlFor="amount">Payment amount (₹)</Label>
            <Input id="amount" inputMode="decimal" className={cn("mt-1.5 h-12 text-lg tabular", errors.total && "border-destructive")} placeholder="0.00" value={total} onChange={(e) => setTotal(e.target.value)} />
            {err("total")}
          </div>
        </>
      ) : (
        <>
          <div>
            <Label>Item</Label>
            <div className="mt-1.5"><ItemCombobox key={type} type={type} value={itemId} invalid={!!errors.item} onChange={(i) => { setItemId(i.id); setItemName(i.name); }} /></div>
            {entry && itemName && <p className="mt-1 text-xs text-muted-foreground">Saved description: “{itemName}”</p>}
            {err("item")}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="qty">Qty <span className="font-normal text-muted-foreground">(opt.)</span></Label>
              <Input id="qty" inputMode="decimal" className={cn("mt-1.5 h-12 text-base tabular", errors.qty && "border-destructive")} placeholder="—" value={qty} onChange={(e) => onQty(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="unit">Unit ₹</Label>
              <Input id="unit" inputMode="decimal" disabled={!qtyN} className={cn("mt-1.5 h-12 text-base tabular", errors.unit && "border-destructive")} placeholder={qtyN ? "0.00" : "Needs qty"} value={qtyN ? unit : ""} onChange={(e) => onUnit(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="total">Total ₹</Label>
              <Input id="total" inputMode="decimal" className={cn("mt-1.5 h-12 text-base font-semibold tabular", errors.total && "border-destructive")} placeholder="0.00" value={total} onChange={(e) => onTotal(e.target.value)} />
            </div>
          </div>
          {(errors.qty || errors.unit || errors.total) && <div>{err("qty")}{err("unit")}{err("total")}</div>}
          <p className="-mt-3 text-xs text-muted-foreground">Enter quantity with unit price or total — the other is calculated.</p>
        </>
      )}

      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" max={todayISO()} className={cn("mt-1.5 h-12 text-base", errors.date && "border-destructive")} value={date} onChange={(e) => setDate(e.target.value)} />
        {err("date")}
      </div>

      <div>
        <Label>{isPayment ? "Supporting image" : "Bill images"} <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <div className="mt-1.5"><AttachmentPicker siteId={siteId} date={date} value={attachments} onChange={setAttachments} existing={existing} /></div>
      </div>

      <div className="sticky bottom-[72px] -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" className="w-full md:w-auto" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}{entry ? "Save changes" : isPayment ? "Save payment" : "Save entry"}
        </Button>
      </div>
    </form>
  );
}
