import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, PageHeader, Panel, PanelTitle, StatCard } from "@/components/app/common";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { billingQueries, billingService } from "@/services/account";
import { can } from "@/services/core";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { toPaise } from "@/lib/money";
import { pageHead } from "@/lib/seo";
import type { BillingPayment, Invoice } from "@/types";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: pageHead(
    "Subscription",
    "Plan, usage-based billing, storage average, invoices and payment history.",
  ),
  component: Subscription,
});

const STATUS: Record<string, string> = {
  paid: "Paid",
  due: "Due",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

function Subscription() {
  const db = useDb();
  const user = useCurrentUser();
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  if (!can(user, "manageStaffSites")) return <EmptyState title="Only the owner can view billing" />;
  const c = billingQueries.current(db);
  const maxB = Math.max(1, ...c.snapshots.map((s) => s.bytes));

  return (
    <>
      <PageHeader
        title="Subscription"
        subtitle={
          <>
            Usage-based plan · period {formatDate(c.period.start)} – {formatDate(c.period.end)}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Wallet balance"
          value={formatINR(db.wallet?.balancePaise ?? 0)}
          hint="Prepaid wallet balance"
        />
        <StatCard
          label="Active sites"
          value={String(c.activeSites)}
          hint={`${c.freeSites} free · ₹109 each after`}
        />
        <StatCard
          label="Enabled staff"
          value={String(c.enabledStaff)}
          hint="Owner excluded · 1 free · ₹29 each after"
        />
        <StatCard
          label="Avg storage"
          value={`${c.avgMB.toFixed(1)} MB`}
          hint={`250 MB free · ${c.storage.blocks} block(s) × ₹5`}
        />
        <StatCard
          label="Estimated total"
          value={formatINR(c.total)}
          hint={`incl. ${db.settings.taxLabel} ${db.settings.taxRatePct}%`}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelTitle
            action={
              <Button
                size="sm"
                variant="outline"
                disabled={issuing}
                onClick={async () => {
                  setIssuing(true);
                  await billingService.issueCurrentInvoice();
                  setIssuing(false);
                  toast.success("Invoice for current period is ready");
                }}
              >
                {issuing && <Loader2 className="animate-spin" />}Issue invoice
              </Button>
            }
          >
            Current period — itemised
          </PanelTitle>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {c.lines.map((l) => (
                <tr key={l.label}>
                  <td className="py-2.5">
                    <p className="font-medium">{l.label}</p>
                    <p className="text-xs text-muted-foreground">{l.detail}</p>
                  </td>
                  <td className="py-2.5 text-right tabular">{formatINR(l.amountPaise)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2">Subtotal</td>
                <td className="py-2 text-right tabular">{formatINR(c.subtotal)}</td>
              </tr>
              {db.settings.showTaxBreakup && (
                <tr>
                  <td className="py-2">
                    {db.settings.taxLabel} ({db.settings.taxRatePct}%)
                  </td>
                  <td className="py-2 text-right tabular">{formatINR(c.tax)}</td>
                </tr>
              )}
              <tr className="font-semibold">
                <td className="py-2.5">Total</td>
                <td className="py-2.5 text-right tabular">{formatINR(c.total)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Completed or inactive sites are not billed. Reactivation is prorated at ₹109 ÷ 30 ×
            remaining days ({c.period.remainingDays} left).
          </p>
        </Panel>
        <Panel>
          <PanelTitle>Daily storage this period</PanelTitle>
          {c.snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet.</p>
          ) : (
            <>
              <div
                className="flex h-32 items-end gap-0.5"
                role="img"
                aria-label="Daily storage bar chart"
              >
                {c.snapshots.map((s) => (
                  <div
                    key={s.date}
                    title={`${formatDate(s.date)}: ${(s.bytes / 1048576).toFixed(1)} MB`}
                    className={`flex-1 rounded-t ${s.bytes / 1048576 > 250 ? "bg-warning" : "bg-primary"}`}
                    style={{ height: `${(s.bytes / maxB) * 100}%` }}
                  />
                ))}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Days recorded</dt>
                <dd className="text-right">{c.snapshots.length}</dd>
                <dt className="text-muted-foreground">Arithmetic average</dt>
                <dd className="text-right">{c.avgMB.toFixed(2)} MB</dd>
                <dt className="text-muted-foreground">Above free 250 MB</dt>
                <dd className="text-right">{c.storage.overMB.toFixed(2)} MB</dd>
                <dt className="text-muted-foreground">Billable blocks (started 250 MB)</dt>
                <dd className="text-right">{c.storage.blocks}</dd>
                <dt className="font-semibold">Storage charge</dt>
                <dd className="text-right font-semibold">{formatINR(c.storage.amount)}</dd>
              </dl>
            </>
          )}
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelTitle>Invoices</PanelTitle>
        <ul className="divide-y">
          {db.invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{inv.number}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                </p>
              </div>
              <span className="text-sm font-semibold tabular">{formatINR(inv.totalPaise)}</span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                {STATUS[inv.status]}
              </span>
              {inv.status === "due" && (
                <>
                  <Button size="sm" onClick={() => setOnlineOpen(true)}>
                    <CreditCard /> Pay online
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPayFor(inv)}>
                    Submit manual payment
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-5">
        <PanelTitle>Wallet activity</PanelTitle>
        {(db.wallet?.transactions?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            No wallet credits yet. Ask support if you need a top-up before Razorpay goes live.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {db.wallet.transactions.map((t) => (
              <li key={t.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>
                  {formatDateTime(t.at)} · {t.kind} · {t.funding}
                  {t.note ? ` · ${t.note}` : t.reference ? ` · ${t.reference}` : ""}
                </span>
                <span
                  className={`font-semibold tabular ${t.amountPaise < 0 ? "text-destructive" : ""}`}
                >
                  {formatINR(t.amountPaise)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mt-5">
        <PanelTitle>Payment history</PanelTitle>
        {db.billingPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {db.billingPayments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>
                  {formatDateTime(p.at)} · {p.method.replace("_", " ")} · {p.reference}
                </span>
                <span className="font-semibold tabular">
                  {formatINR(p.amountPaise)} · {STATUS[p.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={onlineOpen} onOpenChange={setOnlineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Online payment</DialogTitle>
            <DialogDescription>
              Payment gateway integration requires the backend and is not available in this demo. No
              payment has been taken.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOnlineOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ManualPaymentDialog invoice={payFor} onClose={() => setPayFor(null)} />
    </>
  );
}

function ManualPaymentDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice | null;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<BillingPayment["method"]>("upi");
  const [ref, setRef] = useState("");
  const [amt, setAmt] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Dialog
      open={!!invoice}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setErr("");
          setRef("");
          setAmt("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit manual payment</DialogTitle>
          <DialogDescription>
            {invoice?.number} · {invoice && formatINR(invoice.totalPaise)}. It will stay pending
            until approved by CuboSites.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as BillingPayment["method"])}>
              <SelectTrigger className="mt-1.5 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ref">Transaction reference</Label>
            <Input
              id="ref"
              className="mt-1.5 h-11"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="amt">Amount paid (₹)</Label>
            <Input
              id="amt"
              inputMode="decimal"
              className="mt-1.5 h-11"
              placeholder={invoice ? (invoice.totalPaise / 100).toFixed(2) : ""}
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setErr("");
              try {
                await billingService.submitManualPayment(
                  invoice!.id,
                  method,
                  ref,
                  toPaise(amt) ?? 0,
                );
                toast.success("Submitted — pending approval");
                onClose();
                setRef("");
                setAmt("");
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Loader2 className="animate-spin" />}Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
