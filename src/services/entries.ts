import type { DemoDB, Entry, EntryType, ExpenseType, Item } from "@/types";
import { store, delay } from "@/mock/store";
import { normalize, uid } from "@/mock/seed";
import { addLog, assertCan, visibleSiteIds } from "./core";
import { authService, actorId } from "./auth";
import { apiEnabled, apiFetch } from "@/lib/api";
import { refreshWorkspace } from "./sync";

export interface EntryFilter {
  siteId?: string;
  type?: EntryType | "expenses" | "all";
  from?: string;
  to?: string;
  q?: string;
  itemId?: string;
  staffId?: string;
}

export const entryQueries = {
  list(d: DemoDB, f: EntryFilter = {}) {
    const ids = new Set(visibleSiteIds(d, authService.currentUser()));
    const q = (f.q ?? "").trim().toLowerCase();
    return d.entries
      .filter((e) => ids.has(e.siteId))
      .filter((e) => !f.siteId || f.siteId === "all" || e.siteId === f.siteId)
      .filter(
        (e) =>
          !f.type ||
          f.type === "all" ||
          (f.type === "expenses" ? e.type !== "payment" : e.type === f.type),
      )
      .filter((e) => (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to))
      .filter((e) => !f.itemId || f.itemId === "all" || e.itemId === f.itemId)
      .filter((e) => !f.staffId || f.staffId === "all" || e.createdBy === f.staffId)
      .filter((e) => !q || e.description.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  },
  get: (d: DemoDB, id: string) => d.entries.find((e) => e.id === id),
};

export const itemQueries = {
  byType: (d: DemoDB, type: ExpenseType) =>
    d.items.filter((i) => i.type === type).sort((a, b) => a.name.localeCompare(b.name)),
  findDuplicate: (d: DemoDB, type: ExpenseType, name: string) =>
    d.items.find((i) => i.type === type && i.normalized === normalize(name)),
};

export const itemService = {
  async create(type: ExpenseType, name: string): Promise<{ item: Item; existed: boolean }> {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) throw new Error("Item name is required.");
    if (clean.length > 80) throw new Error("Item name is too long.");
    if (apiEnabled) {
      const res = await apiFetch<{ item: Record<string, unknown>; existed: boolean }>(
        "/api/v1/items/",
        {
          method: "POST",
          json: { type, name: clean },
        },
      );
      await refreshWorkspace();
      const item = store.get().items.find((i) => i.id === String(res.item.id))!;
      return { item, existed: res.existed };
    }
    const dup = itemQueries.findDuplicate(store.get(), type, clean);
    if (dup) return { item: dup, existed: true };
    assertCan(authService.currentUser(), "manageItems");
    await delay(200);
    const item: Item = {
      id: uid("i"),
      type,
      name: clean,
      normalized: normalize(clean),
      createdAt: new Date().toISOString(),
    };
    store.update((d) => {
      d.items.push(item);
      addLog(d, {
        action: "create",
        targetType: "item",
        targetId: item.id,
        summary: `Added reusable item “${clean}” (${type})`,
      });
    });
    return { item, existed: false };
  },
  async rename(id: string, name: string) {
    assertCan(authService.currentUser(), "manageItems");
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) throw new Error("Item name is required.");
    if (apiEnabled) {
      await apiFetch(`/api/v1/items/${id}/`, { method: "PATCH", json: { name: clean } });
      await refreshWorkspace();
      return;
    }
    const d0 = store.get();
    const it = d0.items.find((i) => i.id === id)!;
    const dup = itemQueries.findDuplicate(d0, it.type, clean);
    if (dup && dup.id !== id) throw new Error("An item with this name already exists.");
    await delay(200);
    store.update((d) => {
      const i = d.items.find((x) => x.id === id)!;
      const before = i.name;
      i.name = clean;
      i.normalized = normalize(clean);
      addLog(d, {
        action: "update",
        targetType: "item",
        targetId: id,
        summary: `Renamed item “${before}” → “${clean}”`,
        before: { name: before },
        after: { name: clean },
      });
    });
  },
};

export interface EntryInput {
  siteId: string;
  type: EntryType;
  itemId?: string;
  description: string;
  quantity?: number;
  unitPricePaise?: number;
  totalPaise: number;
  date: string;
  attachmentIds: string[];
}

const validate = (i: EntryInput) => {
  if (!i.siteId) throw new Error("Select a site.");
  if (!i.description.trim())
    throw new Error(
      i.type === "payment" ? "Add a description or reference." : "Select or add an item.",
    );
  if (!(i.totalPaise > 0)) throw new Error("Amount must be greater than zero.");
  if (!i.date) throw new Error("Select a date.");
};

export const entryService = {
  async create(input: EntryInput): Promise<Entry> {
    assertCan(authService.currentUser(), "createEntries");
    validate(input);
    if (apiEnabled) {
      const created = await apiFetch<Record<string, unknown>>("/api/v1/entries/", {
        method: "POST",
        json: {
          site_id: input.siteId,
          type: input.type,
          item_id: input.itemId,
          description: input.description.trim(),
          quantity: input.quantity,
          unit_price_paise: input.unitPricePaise,
          total_paise: input.totalPaise,
          date: input.date,
          attachment_ids: input.attachmentIds,
        },
      });
      await refreshWorkspace();
      return store.get().entries.find((e) => e.id === String(created.id))!;
    }
    await delay(450);
    const now = new Date().toISOString();
    const e: Entry = {
      id: uid("e"),
      ...input,
      description: input.description.trim(),
      createdBy: actorId(),
      createdAt: now,
      updatedAt: now,
    };
    store.update((d) => {
      d.entries.push(e);
      d.attachments.forEach((a) => {
        if (input.attachmentIds.includes(a.id)) a.entryId = e.id;
      });
      d.prefs.lastSiteId = input.siteId;
      addLog(d, {
        action: "create",
        targetType: "entry",
        targetId: e.id,
        siteId: e.siteId,
        summary: `Added ${e.type === "payment" ? "client payment" : e.type} “${e.description}”`,
        after: { amount: e.totalPaise / 100, date: e.date, qty: e.quantity },
      });
    });
    return e;
  },
  async update(id: string, input: EntryInput) {
    assertCan(authService.currentUser(), "editEntries");
    validate(input);
    if (apiEnabled) {
      await apiFetch(`/api/v1/entries/${id}/`, {
        method: "PATCH",
        json: {
          site_id: input.siteId,
          type: input.type,
          item_id: input.itemId,
          description: input.description.trim(),
          quantity: input.quantity,
          unit_price_paise: input.unitPricePaise,
          total_paise: input.totalPaise,
          date: input.date,
          attachment_ids: input.attachmentIds,
        },
      });
      await refreshWorkspace();
      return;
    }
    await delay(400);
    store.update((d) => {
      const e = d.entries.find((x) => x.id === id)!;
      const before = {
        amount: e.totalPaise / 100,
        date: e.date,
        qty: e.quantity,
        description: e.description,
      };
      Object.assign(e, input, { updatedAt: new Date().toISOString() });
      d.attachments.forEach((a) => {
        if (input.attachmentIds.includes(a.id)) a.entryId = e.id;
      });
      addLog(d, {
        action: "update",
        targetType: "entry",
        targetId: id,
        siteId: e.siteId,
        summary: `Edited entry “${e.description}”`,
        before,
        after: {
          amount: e.totalPaise / 100,
          date: e.date,
          qty: e.quantity,
          description: e.description,
        },
      });
    });
  },
  async remove(id: string) {
    assertCan(authService.currentUser(), "editEntries");
    if (apiEnabled) {
      await apiFetch(`/api/v1/entries/${id}/`, { method: "DELETE" });
      await refreshWorkspace();
      return;
    }
    await delay(300);
    store.update((d) => {
      const e = d.entries.find((x) => x.id === id)!;
      d.entries = d.entries.filter((x) => x.id !== id);
      d.attachments = d.attachments.filter((a) => a.entryId !== id);
      addLog(d, {
        action: "delete",
        targetType: "entry",
        targetId: id,
        siteId: e.siteId,
        summary: `Deleted entry “${e.description}”`,
        before: { amount: e.totalPaise / 100, date: e.date },
      });
    });
  },
};
