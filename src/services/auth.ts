// DEMO AUTH SERVICE — not secure. Session lives in localStorage purely for demo.
// Replace with real backend auth; never rely on frontend checks for authorization.
import type { Session, User } from "@/types";
import { store, delay } from "@/mock/store";
import { uid } from "@/mock/seed";

const KEY = "cubesites.demo.session";
export const DEMO_PASSWORD = "demo1234";
const listeners = new Set<() => void>();

let cached: Session | null | undefined;
const read = (): Session | null => {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined") return null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { cached = null; }
  return cached ?? null;
};
const write = (s: Session | null) => {
  cached = s;
  if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
};

export const authService = {
  session: read,
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
  currentUser(): User | null {
    const s = read();
    if (!s) return null;
    const u = store.get().users.find((x) => x.id === s.userId);
    return u && u.active ? u : null;
  },
  async login(identifier: string, password: string): Promise<User> {
    await delay(600);
    const id = identifier.trim().toLowerCase();
    const u = store.get().users.find((x) => x.email.toLowerCase() === id || x.phone.replace(/\D/g, "").endsWith(id.replace(/\D/g, "")) && id.replace(/\D/g, "").length >= 10);
    if (!u || password !== DEMO_PASSWORD) throw new Error("Incorrect email/phone or password.");
    if (!u.active) throw new Error("This account is disabled. Ask the owner to enable it.");
    write({ userId: u.id, startedAt: new Date().toISOString() });
    store.update((d) => { d.activity.unshift({ id: uid("l"), actorId: u.id, at: new Date().toISOString(), action: "login", targetType: "session", summary: `${u.name} signed in` }); });
    return u;
  },
  logout() { write(null); },
  demoAccounts: () => store.get().users.filter((u) => u.active).map((u) => ({ email: u.email, role: u.role, name: u.name })),
};

export const actorId = () => read()?.userId ?? "u_owner";
