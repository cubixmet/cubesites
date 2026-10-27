// Shared helpers for mock services.
import type { ActivityLog, DemoDB, PermissionKey, User } from "@/types";
import { uid } from "@/mock/seed";
import { actorId } from "./auth";

export const addLog = (d: DemoDB, l: Omit<ActivityLog, "id" | "at" | "actorId">) => {
  d.activity.unshift({ id: uid("l"), at: new Date().toISOString(), actorId: actorId(), ...l });
};

/** DEMO permission check — UI convenience only, not security. */
export const can = (u: User | null | undefined, k: PermissionKey) => !!u && (u.role === "owner" || u.permissions[k]);

export const assertCan = (u: User | null, k: PermissionKey) => {
  if (!can(u, k)) throw new Error("You don't have permission for this action.");
};

/** Sites visible to the user (owner sees all). */
export const visibleSiteIds = (d: DemoDB, u: User | null) =>
  !u ? [] : u.role === "owner" ? d.sites.map((s) => s.id) : u.siteIds;
