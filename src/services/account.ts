// Billing, settings, notifications, prefs. Mock only — no real payments are processed.
import type { BillingPayment, DemoDB, DriveStatus, Settings } from "@/types";
import { store, delay } from "@/mock/store";
import { uid } from "@/mock/seed";
import { addLog, assertCan } from "./core";
import { authService } from "./auth";
import { averageMB, billingPeriod, buildInvoiceLines, reactivationCharge, storageCharge, taxOn, PRICING } from "@/lib/billing";
import { staffQueries } from "./staff";

export const billingQueries = {
  current(d: DemoDB) {
    const period = billingPeriod();
    const activeSites = d.sites.filter((s) => s.status === "active").length;
    const enabledStaff = staffQueries.enabledCount(d);
    const snaps = d.storage.filter((s) => s.date >= period.start && s.date <= period.end);
    const avg = averageMB(snaps.map((s) => s.bytes));
    const lines = buildInvoiceLines({ activeSites, enabledStaff, avgMB: avg });
    const subtotal = lines.reduce((a, b) => a + b.amountPaise, 0);
    const tax = taxOn(subtotal, d.settings.taxRatePct);
    return { period, activeSites, enabledStaff, avgMB: avg, storage: storageCharge(avg), snapshots: snaps, lines, subtotal, tax, total: subtotal + tax, freeSites: PRICING.freeSites };
  },
  reactivationQuote(d: DemoDB) {
    const p = billingPeriod();
    const activeSites = d.sites.filter((s) => s.status === "active").length;
    const free = activeSites < PRICING.freeSites;
    return { ...p, amount: free ? 0 : reactivationCharge(p.remainingDays), free };
  },
};

export const billingService = {
  async submitManualPayment(invoiceId: string, method: BillingPayment["method"], reference: string, amountPaise: number) {
    assertCan(authService.currentUser(), "manageStaffSites");
    if (!reference.trim()) throw new Error("Enter the transaction reference.");
    if (!(amountPaise > 0)) throw new Error("Enter the amount paid.");
    await delay(500);
    store.update((d) => {
      d.billingPayments.unshift({ id: uid("bp"), invoiceId, amountPaise, method, reference: reference.trim(), status: "pending_approval", at: new Date().toISOString() });
      const inv = d.invoices.find((i) => i.id === invoiceId);
      if (inv) inv.status = "pending_approval";
      addLog(d, { action: "create", targetType: "invoice", targetId: invoiceId, summary: `Submitted manual payment ${reference.trim()} for approval` });
    });
  },
  /** Issues the current period's invoice from live usage (idempotent per period). */
  async issueCurrentInvoice() {
    await delay(300);
    const d0 = store.get();
    const c = billingQueries.current(d0);
    const existing = d0.invoices.find((i) => i.periodStart === c.period.start);
    if (existing) return existing.id;
    const id = uid("inv");
    store.update((d) => {
      d.invoices.unshift({ id, number: `CS-${c.period.start.slice(0, 7)}-${String(d.invoices.length + 1).padStart(3, "0")}`, periodStart: c.period.start, periodEnd: c.period.end, lines: c.lines, subtotalPaise: c.subtotal, taxPaise: c.tax, totalPaise: c.total, status: "due", issuedAt: new Date().toISOString() });
    });
    return id;
  },
};

export const settingsService = {
  async update(patch: Partial<Settings>) {
    await delay(250);
    store.update((d) => { d.settings = { ...d.settings, ...patch }; addLog(d, { action: "update", targetType: "settings", summary: `Updated settings: ${Object.keys(patch).join(", ")}` }); });
  },
  async updateAccount(patch: Partial<DemoDB["account"]>) {
    assertCan(authService.currentUser(), "manageStaffSites");
    if (patch.businessName !== undefined && !patch.businessName.trim()) throw new Error("Business name is required.");
    await delay(300);
    store.update((d) => { d.account = { ...d.account, ...patch }; addLog(d, { action: "update", targetType: "settings", summary: "Updated workspace details" }); });
  },
  async updateProfile(userId: string, patch: { name: string; phone: string }) {
    if (!patch.name.trim()) throw new Error("Name is required.");
    if (patch.phone.replace(/\D/g, "").length < 10) throw new Error("Enter a valid phone number.");
    await delay(300);
    store.update((d) => { const u = d.users.find((x) => x.id === userId)!; Object.assign(u, patch); addLog(d, { action: "update", targetType: "staff", targetId: userId, summary: "Updated own profile" }); });
  },
  /** Demo-only: switch the displayed Drive state. Does NOT contact Google. */
  async simulateDrive(status: DriveStatus) {
    await delay(300);
    store.update((d) => { d.settings.driveStatus = status; });
  },
};

export const notificationService = {
  markAllRead() { store.update((d) => d.notifications.forEach((n) => (n.read = true))); },
  markRead(id: string) { store.update((d) => { const n = d.notifications.find((x) => x.id === id); if (n) n.read = true; }); },
};

export const prefService = {
  lastSiteId: (d: DemoDB) => d.prefs.lastSiteId,
  setLastSite(id: string) { store.update((d) => { d.prefs.lastSiteId = id; }); },
};

export const demoService = { reset: () => store.reset() };
