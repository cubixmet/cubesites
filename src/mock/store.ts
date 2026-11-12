// Client workspace cache. With VITE_API_URL set, data is hydrated from Django
// and not persisted as a full demo DB. Without it, localStorage demo mode is used.
import type { DemoDB } from "@/types";
import { generateDemoDB } from "./seed";
import { apiEnabled } from "@/lib/api";

const KEY = "cubesites.demo.db.v1";
let db: DemoDB | null = null;
const listeners = new Set<() => void>();

const emptyShell = (): DemoDB => ({
  version: 1,
  account: { id: "", businessName: "", ownerName: "", phone: "", email: "", district: "" },
  users: [],
  sites: [],
  items: [],
  entries: [],
  attachments: [],
  activity: [],
  storage: [],
  invoices: [],
  billingPayments: [],
  wallet: { balancePaise: 0, paidRechargedPaise: 0, freeRechargedPaise: 0, transactions: [] },
  notes: [],
  reminders: [],
  notifications: [],
  settings: {
    taxLabel: "GST",
    taxRatePct: 18,
    showTaxBreakup: true,
    driveStatus: "not_connected",
    backups: [],
    notify: { dailySummary: true, paymentReceived: true, backupFailure: true, invoiceDue: true },
  },
  prefs: {},
});

const load = (): DemoDB => {
  if (db) return db;
  if (apiEnabled) {
    db = emptyShell();
    return db;
  }
  if (typeof window === "undefined") return (db = generateDemoDB());
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDB;
      parsed.notes = parsed.notes ?? [];
      parsed.reminders = parsed.reminders ?? [];
      parsed.wallet = parsed.wallet ?? {
        balancePaise: 0,
        paidRechargedPaise: 0,
        freeRechargedPaise: 0,
        transactions: [],
      };
      return (db = parsed);
    }
  } catch {
    /* fall through */
  }
  db = generateDemoDB();
  persist();
  return db;
};

const persist = () => {
  if (apiEnabled || typeof window === "undefined" || !db) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error("Browser storage is full. Remove some demo photos or reset demo data.");
  }
};

const notify = () => listeners.forEach((l) => l());

export const store = {
  get: (): DemoDB => load(),
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Immutable update: mutator receives a structured clone. */
  update(mutator: (draft: DemoDB) => void) {
    const draft = structuredClone(load());
    mutator(draft);
    const prev = db;
    db = draft;
    try {
      persist();
    } catch (e) {
      db = prev;
      throw e;
    }
    notify();
  },
  /** Replace entire cache (used after API hydrate). */
  replace(next: DemoDB) {
    db = next;
    persist();
    notify();
  },
  reset() {
    if (apiEnabled) {
      db = emptyShell();
      notify();
      return;
    }
    db = generateDemoDB();
    persist();
    notify();
  },
};

export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
