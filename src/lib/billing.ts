// Reusable CubeSites billing rules. All amounts in paise.
import type { InvoiceLine } from "@/types";

export const PRICING = {
  sitePerMonth: 10900,
  freeSites: 3,
  staffPerMonth: 2900,
  freeStaff: 1,
  freeStorageMB: 250,
  storageBlockMB: 250,
  storageBlockPrice: 500,
  daysPerMonth: 30,
} as const;

export const siteCharge = (activeSites: number) => {
  const billable = Math.max(0, activeSites - PRICING.freeSites);
  return { billable, amount: billable * PRICING.sitePerMonth };
};

/** Owner must not be passed in; count only enabled non-owner accounts. */
export const staffCharge = (enabledStaff: number) => {
  const billable = Math.max(0, enabledStaff - PRICING.freeStaff);
  return { billable, amount: billable * PRICING.staffPerMonth };
};

export const averageMB = (bytesPerDay: number[]) =>
  bytesPerDay.length === 0 ? 0 : bytesPerDay.reduce((a, b) => a + b, 0) / bytesPerDay.length / (1024 * 1024);

export const storageCharge = (avgMB: number) => {
  const over = Math.max(0, avgMB - PRICING.freeStorageMB);
  const blocks = over > 0 ? Math.ceil(over / PRICING.storageBlockMB) : 0;
  return { overMB: over, blocks, amount: blocks * PRICING.storageBlockPrice };
};

/** Proration for reactivating a site: ₹109 / 30 × remaining billable days. */
export const reactivationCharge = (remainingDays: number) =>
  Math.round((PRICING.sitePerMonth * Math.max(0, Math.min(PRICING.daysPerMonth, remainingDays))) / PRICING.daysPerMonth);

export const taxOn = (subtotal: number, ratePct: number) => Math.round((subtotal * ratePct) / 100);

/** Current 30-day billing period starting on the 1st of the month. */
export const billingPeriod = (now = new Date()) => {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(start);
  end.setDate(start.getDate() + PRICING.daysPerMonth - 1);
  const dayIndex = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const remaining = Math.max(0, PRICING.daysPerMonth - dayIndex);
  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), remainingDays: remaining };
};

export const buildInvoiceLines = (opts: { activeSites: number; enabledStaff: number; avgMB: number }): InvoiceLine[] => {
  const s = siteCharge(opts.activeSites);
  const st = staffCharge(opts.enabledStaff);
  const g = storageCharge(opts.avgMB);
  return [
    { label: "Active sites", detail: `${opts.activeSites} active · ${PRICING.freeSites} free · ${s.billable} × ₹109`, amountPaise: s.amount },
    { label: "Staff accounts", detail: `${opts.enabledStaff} enabled · ${PRICING.freeStaff} free · ${st.billable} × ₹29`, amountPaise: st.amount },
    { label: "Storage", detail: `${opts.avgMB.toFixed(1)} MB avg · 250 MB free · ${g.blocks} × ₹5`, amountPaise: g.amount },
  ];
};
