import type { DemoDB, Permissions, Role, User } from "@/types";
import { store, delay } from "@/mock/store";
import { permissionsFor, uid } from "@/mock/seed";
import { addLog, assertCan } from "./core";
import { authService } from "./auth";

export interface StaffInput { name: string; phone: string; email: string; role: Exclude<Role, "owner">; siteIds: string[]; permissions: Permissions; active: boolean }

export const staffQueries = {
  list: (d: DemoDB) => d.users.filter((u) => u.role !== "owner"),
  all: (d: DemoDB) => d.users,
  get: (d: DemoDB, id: string) => d.users.find((u) => u.id === id),
  name: (d: DemoDB, id: string) => d.users.find((u) => u.id === id)?.name ?? "Unknown",
  enabledCount: (d: DemoDB) => d.users.filter((u) => u.role !== "owner" && u.active).length,
  forSite: (d: DemoDB, siteId: string) => d.users.filter((u) => u.role !== "owner" && u.siteIds.includes(siteId)),
};

export const defaultPermissions = permissionsFor;

const validate = (d: DemoDB, i: StaffInput, id?: string) => {
  if (!i.name.trim()) throw new Error("Name is required.");
  if (i.phone.replace(/\D/g, "").length < 10) throw new Error("Enter a valid 10-digit phone number.");
  if (!/^\S+@\S+\.\S+$/.test(i.email)) throw new Error("Enter a valid email.");
  if (d.users.some((u) => u.id !== id && u.email.toLowerCase() === i.email.trim().toLowerCase())) throw new Error("Another account uses this email.");
};

export const staffService = {
  async create(i: StaffInput) {
    assertCan(authService.currentUser(), "manageStaffSites");
    validate(store.get(), i);
    await delay();
    const u: User = { id: uid("u"), name: i.name.trim(), phone: i.phone.trim(), email: i.email.trim().toLowerCase(), role: i.role, active: i.active, permissions: i.permissions, siteIds: i.siteIds, createdAt: new Date().toISOString() };
    store.update((d) => { d.users.push(u); addLog(d, { action: "create", targetType: "staff", targetId: u.id, summary: `Added staff ${u.name} (${u.role})`, after: { role: u.role, sites: u.siteIds.length } }); });
    return u;
  },
  async update(id: string, i: StaffInput) {
    assertCan(authService.currentUser(), "manageStaffSites");
    validate(store.get(), i, id);
    await delay();
    store.update((d) => {
      const u = d.users.find((x) => x.id === id)!;
      const before = { role: u.role, active: u.active, sites: u.siteIds.length };
      Object.assign(u, { name: i.name.trim(), phone: i.phone.trim(), email: i.email.trim().toLowerCase(), role: i.role, siteIds: i.siteIds, permissions: i.permissions, active: i.active });
      addLog(d, { action: i.active ? "update" : "deactivate", targetType: "staff", targetId: id, summary: `Updated staff ${u.name}`, before, after: { role: u.role, active: u.active, sites: u.siteIds.length } });
    });
  },
  async setActive(id: string, active: boolean) {
    assertCan(authService.currentUser(), "manageStaffSites");
    await delay(250);
    store.update((d) => {
      const u = d.users.find((x) => x.id === id)!;
      u.active = active;
      addLog(d, { action: active ? "reactivate" : "deactivate", targetType: "staff", targetId: id, summary: `${active ? "Enabled" : "Disabled"} ${u.name}`, before: { active: !active }, after: { active } });
    });
  },
  async assignToSite(siteId: string, userIds: string[]) {
    assertCan(authService.currentUser(), "manageStaffSites");
    await delay(250);
    store.update((d) => {
      d.users.forEach((u) => {
        if (u.role === "owner") return;
        const has = u.siteIds.includes(siteId);
        const want = userIds.includes(u.id);
        if (want && !has) u.siteIds.push(siteId);
        if (!want && has) u.siteIds = u.siteIds.filter((x) => x !== siteId);
      });
      addLog(d, { action: "update", targetType: "site", targetId: siteId, siteId, summary: `Updated staff assignments (${userIds.length} assigned)` });
    });
  },
};
