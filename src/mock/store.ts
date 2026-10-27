// DEMO PERSISTENCE ONLY. Holds the whole mock database in localStorage.
// Replace with HTTP API calls when the backend exists — UI talks only to /services.
import type { DemoDB } from "@/types";
import { generateDemoDB } from "./seed";

const KEY = "cubesites.demo.db.v1";
let db: DemoDB | null = null;
const listeners = new Set<() => void>();

const load = (): DemoDB => {
  if (db) return db;
  if (typeof window === "undefined") return (db = generateDemoDB());
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (db = JSON.parse(raw) as DemoDB);
  } catch { /* fall through */ }
  db = generateDemoDB();
  persist();
  return db;
};

const persist = () => {
  if (typeof window === "undefined" || !db) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error("Browser storage is full. Remove some demo photos or reset demo data.");
  }
};

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
    try { persist(); } catch (e) { db = prev; throw e; }
    listeners.forEach((l) => l());
  },
  reset() {
    db = generateDemoDB();
    persist();
    listeners.forEach((l) => l());
  },
};

export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
