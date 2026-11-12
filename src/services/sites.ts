import type { DemoDB, Site, SiteStatus } from "@/types";
import { store, delay } from "@/mock/store";
import { uid } from "@/mock/seed";
import { addLog, assertCan, visibleSiteIds } from "./core";
import { authService, actorId } from "./auth";
import { sumPaise } from "@/lib/money";
import { todayISO } from "@/lib/format";
import { apiEnabled, apiFetch } from "@/lib/api";
import { refreshWorkspace } from "./sync";

export interface SiteInput {
  name: string;
  primaryPhone: string;
  altPhone?: string;
  address?: string;
}

export const siteQueries = {
  list(d: DemoDB, opts: { q?: string; status?: SiteStatus | "all" } = {}) {
    const ids = new Set(visibleSiteIds(d, authService.currentUser()));
    const q = (opts.q ?? "").trim().toLowerCase();
    return d.sites
      .filter((s) => ids.has(s.id))
      .filter(
        (s) =>
          !q || s.name.toLowerCase().includes(q) || (s.address ?? "").toLowerCase().includes(q),
      )
      .filter((s) => !opts.status || opts.status === "all" || s.status === opts.status)
      .sort((a, b) =>
        a.status === b.status ? a.name.localeCompare(b.name) : a.status === "active" ? -1 : 1,
      );
  },
  get: (d: DemoDB, id: string) => d.sites.find((s) => s.id === id),
  totals(d: DemoDB, siteId: string, from?: string, to?: string) {
    const es = d.entries.filter(
      (e) => e.siteId === siteId && (!from || e.date >= from) && (!to || e.date <= to),
    );
    const expenses = sumPaise(es.filter((e) => e.type !== "payment").map((e) => e.totalPaise));
    const payments = sumPaise(es.filter((e) => e.type === "payment").map((e) => e.totalPaise));
    return { expenses, payments, net: payments - expenses, count: es.length };
  },
};

const validate = (i: SiteInput) => {
  if (!i.name.trim()) throw new Error("Site name is required.");
  if (/[<>]/.test(i.name)) throw new Error("Site name cannot contain < or > characters.");
  if (i.primaryPhone.replace(/\D/g, "").length < 10)
    throw new Error("Enter a valid 10-digit contact number.");
  if (i.altPhone && i.altPhone.replace(/\D/g, "").length < 10)
    throw new Error("Additional phone must be 10 digits.");
  if ((i.address?.trim() || "").length > 400)
    throw new Error("Address must be 400 characters or fewer.");
};

export const siteService = {
  async create(input: SiteInput) {
    assertCan(authService.currentUser(), "manageStaffSites");
    validate(input);
    if (apiEnabled) {
      await apiFetch("/api/v1/sites/", {
        method: "POST",
        json: {
          name: input.name.trim(),
          primary_phone: input.primaryPhone.trim(),
          alt_phone: input.altPhone?.trim() || "",
          address: input.address?.trim() || "",
        },
      });
      await refreshWorkspace();
      return store.get().sites.find((s) => s.name === input.name.trim())!;
    }
    await delay();
    const now = new Date().toISOString();
    const site: Site = {
      id: uid("s"),
      name: input.name.trim(),
      primaryPhone: input.primaryPhone.trim(),
      altPhone: input.altPhone?.trim() || undefined,
      address: input.address?.trim() || undefined,
      status: "active",
      startDate: todayISO(),
      statusHistory: [{ status: "active", at: now, by: actorId() }],
      createdAt: now,
    };
    store.update((d) => {
      d.sites.push(site);
      addLog(d, {
        action: "create",
        targetType: "site",
        targetId: site.id,
        siteId: site.id,
        summary: `Created site “${site.name}”`,
        after: { ...input },
      });
    });
    return site;
  },
  async update(id: string, input: SiteInput) {
    assertCan(authService.currentUser(), "manageStaffSites");
    validate(input);
    if (apiEnabled) {
      await apiFetch(`/api/v1/sites/${id}/`, {
        method: "PATCH",
        json: {
          name: input.name.trim(),
          primary_phone: input.primaryPhone.trim(),
          alt_phone: input.altPhone?.trim() || "",
          address: input.address?.trim() || "",
        },
      });
      await refreshWorkspace();
      return;
    }
    await delay();
    store.update((d) => {
      const s = d.sites.find((x) => x.id === id);
      if (!s) throw new Error("Site not found");
      const before = {
        name: s.name,
        primaryPhone: s.primaryPhone,
        altPhone: s.altPhone,
        address: s.address,
      };
      Object.assign(s, {
        name: input.name.trim(),
        primaryPhone: input.primaryPhone.trim(),
        altPhone: input.altPhone?.trim() || undefined,
        address: input.address?.trim() || undefined,
      });
      addLog(d, {
        action: "update",
        targetType: "site",
        targetId: id,
        siteId: id,
        summary: `Updated site “${s.name}”`,
        before,
        after: { ...input },
      });
    });
  },
  async setStatus(id: string, status: SiteStatus) {
    assertCan(authService.currentUser(), "manageStaffSites");
    if (apiEnabled) {
      await apiFetch(`/api/v1/sites/${id}/status/`, { method: "POST", json: { status } });
      await refreshWorkspace();
      return;
    }
    await delay();
    store.update((d) => {
      const s = d.sites.find((x) => x.id === id)!;
      const prev = s.status;
      s.status = status;
      s.statusHistory.push({ status, at: new Date().toISOString(), by: actorId() });
      addLog(d, {
        action:
          status === "active" ? "reactivate" : status === "completed" ? "complete" : "deactivate",
        targetType: "site",
        targetId: id,
        siteId: id,
        summary: `${status === "active" ? "Reactivated" : status === "completed" ? "Marked completed" : "Marked inactive"} “${s.name}”`,
        before: { status: prev },
        after: { status },
      });
    });
  },
};
