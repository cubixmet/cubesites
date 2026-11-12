// Shared helpers for mock services.
import type { ActivityLog, DemoDB, PermissionKey, Permissions, User } from "@/types";
import { PERMISSION_KEYS } from "@/types";
import { uid } from "@/mock/seed";
import { actorId } from "./auth";

export const addLog = (d: DemoDB, l: Omit<ActivityLog, "id" | "at" | "actorId">) => {
  d.activity.unshift({ id: uid("l"), at: new Date().toISOString(), actorId: actorId(), ...l });
};

/** DEMO permission check — UI convenience only, not security. */
export const can = (u: User | null | undefined, k: PermissionKey) =>
  !!u && (u.role === "owner" || u.permissions[k]);

export const assertCan = (u: User | null, k: PermissionKey) => {
  if (!can(u, k)) throw new Error("You don't have permission for this action.");
};

/** Child permission → required parents (mirrors backend sanitize_permissions). */
export const PERMISSION_REQUIRES: Partial<Record<PermissionKey, PermissionKey[]>> = {
  viewFinancials: ["viewSite"],
  createEntries: ["viewSite"],
  editEntries: ["viewSite", "createEntries"],
  manageItems: ["viewSite"],
  uploadMedia: ["viewSite"],
  reports: ["viewSite", "viewFinancials"],
  manageStaffSites: ["viewSite", "viewFinancials"],
};

/** When enabling a permission, also enable related parents. When disabling a parent, clear dependents. */
export function applyPermissionToggle(
  perms: Permissions,
  key: PermissionKey,
  enabled: boolean,
): Permissions {
  const next: Permissions = { ...perms, [key]: enabled };
  if (enabled) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [child, parents] of Object.entries(PERMISSION_REQUIRES) as [
        PermissionKey,
        PermissionKey[],
      ][]) {
        if (!next[child]) continue;
        for (const p of parents) {
          if (!next[p]) {
            next[p] = true;
            changed = true;
          }
        }
      }
    }
    return next;
  }
  // Turning off a key clears any child that requires it.
  for (const child of PERMISSION_KEYS) {
    const parents = PERMISSION_REQUIRES[child];
    if (parents?.includes(key)) next[child] = false;
  }
  return next;
}

/** Sites visible to the user (owner sees all). */
export const visibleSiteIds = (d: DemoDB, u: User | null) =>
  !u ? [] : u.role === "owner" ? d.sites.map((s) => s.id) : u.siteIds;
