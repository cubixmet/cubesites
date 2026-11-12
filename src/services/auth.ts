// Auth: Django JWT (Google / email+OTP signup / email|phone+password login).
import type { Session, User } from "@/types";
import { store, delay } from "@/mock/store";
import { uid } from "@/mock/seed";
import { apiEnabled, apiFetch, getTokens, setTokens, tryRefresh } from "@/lib/api";
import { hydrateFromApi } from "./sync";

const KEY = "cubosites.session";
export const DEMO_PASSWORD = "demo1234";
const listeners = new Set<() => void>();

let cached: Session | null | undefined;
let cachedUser: User | null | undefined;

export type AuthConfig = {
  googleClientId: string;
  googleEnabled: boolean;
  otpExpiryMinutes: number;
};

export type SignupInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessName: string;
};

const read = (): Session | null => {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined") return null;
  try {
    cached = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    cached = null;
  }
  return cached ?? null;
};

const write = (s: Session | null, user?: User | null) => {
  cached = s;
  cachedUser = user === undefined ? cachedUser : user;
  if (typeof window !== "undefined") {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l());
};

function mapApiUser(u: Record<string, unknown>): User {
  return {
    id: String(u.id),
    name: String(u.name || ""),
    phone: String(u.phone || ""),
    email: String(u.email || ""),
    role: u.role as User["role"],
    active: u.active !== false,
    permissions: u.permissions as User["permissions"],
    siteIds: ((u.site_ids as string[]) || (u.siteIds as string[]) || []).map(String),
    createdAt: String(u.date_joined || u.createdAt || new Date().toISOString()),
  };
}

async function finishApiLogin(data: {
  user: Record<string, unknown>;
  workspace: Record<string, unknown> | null;
  tokens: { access: string; refresh: string };
}): Promise<User> {
  if (data.user.is_platform_admin) {
    throw new Error("Use the Super Admin portal for platform accounts.");
  }
  if (!data.workspace) throw new Error("No contractor workspace on this account.");
  setTokens(data.tokens);
  const user = mapApiUser(data.user);
  write({ userId: user.id, startedAt: new Date().toISOString() }, user);
  await hydrateFromApi(user, data.workspace);
  return user;
}

export class SignupRequiredError extends Error {
  email: string;
  override name: string;
  credential: string;
  constructor(email: string, fullName: string, credential: string) {
    super("Complete signup with your business name.");
    this.email = email;
    this.name = fullName;
    this.credential = credential;
  }
}

export const authService = {
  session: read,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  currentUser(): User | null {
    const s = read();
    if (!s) return null;
    if (apiEnabled) {
      if (cachedUser && cachedUser.id === s.userId) return cachedUser.active ? cachedUser : null;
      const u = store.get().users.find((x) => x.id === s.userId);
      return u && u.active ? u : null;
    }
    const u = store.get().users.find((x) => x.id === s.userId);
    return u && u.active ? u : null;
  },
  async getConfig(): Promise<AuthConfig> {
    if (!apiEnabled) {
      return { googleClientId: "", googleEnabled: false, otpExpiryMinutes: 10 };
    }
    return apiFetch<AuthConfig>("/api/auth/config/", { auth: false });
  },
  async login(identifier: string, password: string): Promise<User> {
    if (apiEnabled) {
      const data = await apiFetch<{
        user: Record<string, unknown>;
        workspace: Record<string, unknown> | null;
        tokens: { access: string; refresh: string };
      }>("/api/auth/login/", {
        method: "POST",
        json: { identifier, password },
        auth: false,
      });
      return finishApiLogin(data);
    }

    await delay(600);
    const id = identifier.trim().toLowerCase();
    const u = store
      .get()
      .users.find(
        (x) =>
          x.email.toLowerCase() === id ||
          (x.phone.replace(/\D/g, "").endsWith(id.replace(/\D/g, "")) &&
            id.replace(/\D/g, "").length >= 10),
      );
    if (!u || password !== DEMO_PASSWORD) throw new Error("Incorrect email/phone or password.");
    if (!u.active) throw new Error("This account is disabled. Ask the owner to enable it.");
    write({ userId: u.id, startedAt: new Date().toISOString() }, u);
    store.update((d) => {
      d.activity.unshift({
        id: uid("l"),
        actorId: u.id,
        at: new Date().toISOString(),
        action: "login",
        targetType: "session",
        summary: `${u.name} signed in`,
      });
    });
    return u;
  },
  async loginWithGoogle(
    credential: string,
    extra?: { businessName?: string; phone?: string },
  ): Promise<User> {
    if (!apiEnabled) throw new Error("Connect the API (VITE_API_URL) to use Google Sign-In.");
    const data = await apiFetch<{
      user: Record<string, unknown>;
      workspace: Record<string, unknown> | null;
      tokens: { access: string; refresh: string };
    }>("/api/auth/google/", {
      method: "POST",
      json: {
        credential,
        businessName: extra?.businessName,
        phone: extra?.phone,
      },
      auth: false,
    });
    return finishApiLogin(data);
  },
  async completeGoogleSignup(
    credential: string,
    businessName: string,
    phone: string,
    name: string,
    email: string,
  ): Promise<User> {
    if (!apiEnabled) throw new Error("Connect the API (VITE_API_URL) to use Google Sign-In.");
    const data = await apiFetch<{
      user: Record<string, unknown>;
      workspace: Record<string, unknown> | null;
      tokens: { access: string; refresh: string };
      detail?: string;
      code?: string;
    }>("/api/auth/google/", {
      method: "POST",
      json: { credential, businessName, phone, name, email },
      auth: false,
    });
    return finishApiLogin(data);
  },
  async startSignup(input: SignupInput): Promise<{ email: string; expiresInMinutes: number }> {
    if (!apiEnabled) throw new Error("Connect the API (VITE_API_URL) to sign up.");
    const data = await apiFetch<{ email: string; expiresInMinutes: number }>("/api/auth/signup/", {
      method: "POST",
      json: input,
      auth: false,
    });
    return data;
  },
  async verifySignup(email: string, otp: string): Promise<User> {
    if (!apiEnabled) throw new Error("Connect the API (VITE_API_URL) to sign up.");
    const data = await apiFetch<{
      user: Record<string, unknown>;
      workspace: Record<string, unknown> | null;
      tokens: { access: string; refresh: string };
    }>("/api/auth/signup/verify/", {
      method: "POST",
      json: { email, otp },
      auth: false,
    });
    return finishApiLogin(data);
  },
  async resendSignupOtp(email: string): Promise<void> {
    if (!apiEnabled) throw new Error("Connect the API (VITE_API_URL) to sign up.");
    await apiFetch("/api/auth/signup/resend/", {
      method: "POST",
      json: { email },
      auth: false,
    });
  },
  async forgotPassword(email: string): Promise<{ email: string; expiresInMinutes: number }> {
    if (!apiEnabled) throw new Error("Connect the API (VITE_API_URL) to reset password.");
    return apiFetch<{ email: string; expiresInMinutes: number }>("/api/auth/password/forgot/", {
      method: "POST",
      json: { email },
      auth: false,
    });
  },
  async resetPassword(email: string, otp: string, password: string): Promise<void> {
    if (!apiEnabled) throw new Error("Connect the API (VITE_API_URL) to reset password.");
    await apiFetch("/api/auth/password/reset/", {
      method: "POST",
      json: { email, otp, password },
      auth: false,
    });
  },
  async resendPasswordResetOtp(email: string): Promise<void> {
    if (!apiEnabled) throw new Error("Connect the API (VITE_API_URL) to reset password.");
    await apiFetch("/api/auth/password/resend/", {
      method: "POST",
      json: { email },
      auth: false,
    });
  },
  logout() {
    setTokens(null);
    write(null, null);
    if (apiEnabled) store.reset();
  },
  demoAccounts: () => [] as { email: string; role: User["role"]; name: string }[],
  async restoreSession(): Promise<boolean> {
    if (!apiEnabled) return Boolean(read());
    const s = read();
    const tokens = getTokens();
    if (!s || !tokens?.refresh) {
      write(null, null);
      return false;
    }
    // Soft-refresh so returning users keep a long-lived session.
    await tryRefresh();
    try {
      const me = await apiFetch<{
        user: Record<string, unknown>;
        workspace: Record<string, unknown> | null;
      }>("/api/auth/me/");
      if (!me.workspace || me.user.is_platform_admin) {
        authService.logout();
        return false;
      }
      const user = mapApiUser(me.user);
      write(s, user);
      await hydrateFromApi(user, me.workspace);
      return true;
    } catch {
      authService.logout();
      return false;
    }
  },
};

export const actorId = () => read()?.userId ?? "u_owner";
