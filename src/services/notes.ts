import type { DemoDB, Note, Reminder } from "@/types";
import { store, delay } from "@/mock/store";
import { uid } from "@/mock/seed";
import { addLog, assertCan, visibleSiteIds } from "./core";
import { authService, actorId } from "./auth";
import { apiEnabled, apiFetch } from "@/lib/api";
import { refreshWorkspace } from "./sync";

export const noteQueries = {
  list(d: DemoDB, opts: { siteId?: string | null; q?: string } = {}) {
    const ids = new Set(visibleSiteIds(d, authService.currentUser()));
    const q = (opts.q ?? "").trim().toLowerCase();
    return d.notes
      .filter((n) => !n.siteId || ids.has(n.siteId))
      .filter((n) => {
        if (opts.siteId === null) return !n.siteId;
        if (opts.siteId) return n.siteId === opts.siteId;
        return true;
      })
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      .sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
      );
  },
};

export const reminderQueries = {
  list(d: DemoDB, opts: { siteId?: string | null; status?: "open" | "done" | "all" | "due" } = {}) {
    const ids = new Set(visibleSiteIds(d, authService.currentUser()));
    const now = Date.now();
    return d.reminders
      .filter((r) => !r.siteId || ids.has(r.siteId))
      .filter((r) => {
        if (opts.siteId === null) return !r.siteId;
        if (opts.siteId) return r.siteId === opts.siteId;
        return true;
      })
      .filter((r) => {
        const st = opts.status ?? "all";
        if (st === "open") return !r.done;
        if (st === "done") return r.done;
        if (st === "due") return !r.done && new Date(r.dueAt).getTime() <= now;
        return true;
      })
      .sort((a, b) => Number(a.done) - Number(b.done) || a.dueAt.localeCompare(b.dueAt));
  },
};

export const noteService = {
  async create(input: { title: string; body?: string; siteId?: string; pinned?: boolean }) {
    assertCan(authService.currentUser(), "viewSite");
    const title = input.title.trim();
    if (!title) throw new Error("Enter a title.");
    if (apiEnabled) {
      await apiFetch("/api/v1/notes/", {
        method: "POST",
        json: {
          title,
          body: (input.body || "").trim(),
          siteId: input.siteId || null,
          pinned: !!input.pinned,
        },
      });
      await refreshWorkspace();
      return;
    }
    await delay(200);
    store.update((d) => {
      const n: Note = {
        id: uid("note"),
        siteId: input.siteId,
        title,
        body: (input.body || "").trim(),
        pinned: !!input.pinned,
        createdBy: actorId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      d.notes.unshift(n);
      addLog(d, {
        action: "create",
        targetType: "note",
        targetId: n.id,
        siteId: n.siteId,
        summary: `Added note “${n.title}”`,
      });
    });
  },
  async update(
    id: string,
    patch: Partial<Pick<Note, "title" | "body" | "pinned">> & { siteId?: string | null },
  ) {
    assertCan(authService.currentUser(), "viewSite");
    if (apiEnabled) {
      await apiFetch(`/api/v1/notes/${id}/`, {
        method: "PATCH",
        json: {
          ...(patch.title != null ? { title: patch.title } : {}),
          ...(patch.body != null ? { body: patch.body } : {}),
          ...(patch.pinned != null ? { pinned: patch.pinned } : {}),
          ...(patch.siteId !== undefined ? { siteId: patch.siteId || null } : {}),
        },
      });
      await refreshWorkspace();
      return;
    }
    store.update((d) => {
      const n = d.notes.find((x) => x.id === id);
      if (!n) return;
      if (patch.title != null) n.title = patch.title.trim();
      if (patch.body != null) n.body = patch.body;
      if (patch.pinned != null) n.pinned = patch.pinned;
      if (patch.siteId !== undefined) n.siteId = patch.siteId || undefined;
      n.updatedAt = new Date().toISOString();
    });
  },
  async remove(id: string) {
    assertCan(authService.currentUser(), "viewSite");
    if (apiEnabled) {
      await apiFetch(`/api/v1/notes/${id}/`, { method: "DELETE" });
      await refreshWorkspace();
      return;
    }
    store.update((d) => {
      const n = d.notes.find((x) => x.id === id);
      d.notes = d.notes.filter((x) => x.id !== id);
      if (n)
        addLog(d, {
          action: "delete",
          targetType: "note",
          targetId: id,
          siteId: n.siteId,
          summary: `Deleted note “${n.title}”`,
        });
    });
  },
};

export const reminderService = {
  async create(input: { title: string; body?: string; dueAt: string; siteId?: string }) {
    assertCan(authService.currentUser(), "viewSite");
    const title = input.title.trim();
    if (!title) throw new Error("Enter a title.");
    if (!input.dueAt) throw new Error("Pick a date and time for the alarm.");
    if (apiEnabled) {
      await apiFetch("/api/v1/reminders/", {
        method: "POST",
        json: {
          title,
          body: (input.body || "").trim(),
          dueAt: input.dueAt,
          siteId: input.siteId || null,
        },
      });
      await refreshWorkspace();
      return;
    }
    await delay(200);
    store.update((d) => {
      const r: Reminder = {
        id: uid("rem"),
        siteId: input.siteId,
        title,
        body: (input.body || "").trim(),
        dueAt: input.dueAt,
        done: false,
        createdBy: actorId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      d.reminders.unshift(r);
      addLog(d, {
        action: "create",
        targetType: "reminder",
        targetId: r.id,
        siteId: r.siteId,
        summary: `Set reminder “${r.title}”`,
      });
    });
  },
  async update(
    id: string,
    patch: Partial<Pick<Reminder, "title" | "body" | "dueAt" | "done">> & {
      siteId?: string | null;
    },
  ) {
    assertCan(authService.currentUser(), "viewSite");
    if (apiEnabled) {
      await apiFetch(`/api/v1/reminders/${id}/`, {
        method: "PATCH",
        json: {
          ...(patch.title != null ? { title: patch.title } : {}),
          ...(patch.body != null ? { body: patch.body } : {}),
          ...(patch.dueAt != null ? { dueAt: patch.dueAt } : {}),
          ...(patch.done != null ? { done: patch.done } : {}),
          ...(patch.siteId !== undefined ? { siteId: patch.siteId || null } : {}),
        },
      });
      await refreshWorkspace();
      return;
    }
    store.update((d) => {
      const r = d.reminders.find((x) => x.id === id);
      if (!r) return;
      if (patch.title != null) r.title = patch.title.trim();
      if (patch.body != null) r.body = patch.body;
      if (patch.dueAt != null) {
        r.dueAt = patch.dueAt;
        r.notifiedAt = undefined;
      }
      if (patch.done != null) r.done = patch.done;
      if (patch.siteId !== undefined) r.siteId = patch.siteId || undefined;
      r.updatedAt = new Date().toISOString();
    });
  },
  async remove(id: string) {
    assertCan(authService.currentUser(), "viewSite");
    if (apiEnabled) {
      await apiFetch(`/api/v1/reminders/${id}/`, { method: "DELETE" });
      await refreshWorkspace();
      return;
    }
    store.update((d) => {
      d.reminders = d.reminders.filter((x) => x.id !== id);
    });
  },
  async markNotified(id: string) {
    if (apiEnabled) {
      await apiFetch(`/api/v1/reminders/${id}/notify/`, { method: "POST" });
      await refreshWorkspace();
      return;
    }
    store.update((d) => {
      const r = d.reminders.find((x) => x.id === id);
      if (!r || r.notifiedAt) return;
      r.notifiedAt = new Date().toISOString();
      d.notifications.unshift({
        id: uid("n"),
        title: `Reminder: ${r.title}`,
        body: r.body || "It's time.",
        at: new Date().toISOString(),
        read: false,
      });
    });
  },
};
