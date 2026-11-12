// Media: Django multipart upload when API enabled; otherwise local compress + store.
import type { Attachment, AttachmentKind, DemoDB } from "@/types";
import { store } from "@/mock/store";
import { uid } from "@/mock/seed";
import { addLog, assertCan, visibleSiteIds } from "./core";
import { authService, actorId } from "./auth";
import { apiEnabled, apiFetch } from "@/lib/api";
import { refreshWorkspace } from "./sync";

const MAX_BYTES = 10 * 1024 * 1024;

const compress = (file: File): Promise<{ src: string; bytes: number }> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error(`${file.name} is not an image.`));
    if (file.size > MAX_BYTES) return reject(new Error(`${file.name} is larger than 10 MB.`));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const src = c.toDataURL("image/jpeg", 0.7);
      resolve({ src, bytes: file.size });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}.`));
    };
    img.src = url;
  });

export const mediaQueries = {
  list(d: DemoDB, f: { siteId?: string; kind?: AttachmentKind; from?: string; to?: string } = {}) {
    const ids = new Set(visibleSiteIds(d, authService.currentUser()));
    return d.attachments
      .filter(
        (a) =>
          ids.has(a.siteId) &&
          (!f.siteId || f.siteId === "all" || a.siteId === f.siteId) &&
          (!f.kind || a.kind === f.kind),
      )
      .filter((a) => (!f.from || a.date >= f.from) && (!f.to || a.date <= f.to))
      .sort((a, b) => b.date.localeCompare(a.date));
  },
  byIds: (d: DemoDB, ids: string[]) => d.attachments.filter((a) => ids.includes(a.id)),
  totalBytes: (d: DemoDB) => d.attachments.reduce((a, b) => a + b.sizeBytes, 0),
};

export const mediaService = {
  async upload(
    file: File,
    meta: { siteId: string; kind: AttachmentKind; date: string; caption?: string },
    onProgress?: (p: number) => void,
  ): Promise<Attachment> {
    assertCan(authService.currentUser(), "uploadMedia");
    if (apiEnabled) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("siteId", meta.siteId);
      fd.append("kind", meta.kind);
      fd.append("date", meta.date);
      if (meta.caption) fd.append("caption", meta.caption);
      onProgress?.(30);
      const created = await apiFetch<Record<string, unknown>>("/api/v1/media/", {
        method: "POST",
        formData: fd,
      });
      onProgress?.(100);
      await refreshWorkspace();
      return store.get().attachments.find((a) => a.id === String(created.id))!;
    }
    const { src, bytes } = await compress(file);
    for (let p = 10; p <= 100; p += 18) {
      onProgress?.(Math.min(p, 100));
      await new Promise((r) => setTimeout(r, 90));
    }
    const a: Attachment = {
      id: uid("a"),
      siteId: meta.siteId,
      kind: meta.kind,
      name: file.name,
      sizeBytes: bytes,
      src,
      caption: meta.caption?.trim() || undefined,
      date: meta.date,
      createdBy: actorId(),
      createdAt: new Date().toISOString(),
    };
    store.update((d) => {
      d.attachments.push(a);
      if (meta.kind === "photo")
        addLog(d, {
          action: "create",
          targetType: "photo",
          targetId: a.id,
          siteId: a.siteId,
          summary: `Uploaded progress photo${a.caption ? ` “${a.caption}”` : ""}`,
        });
    });
    onProgress?.(100);
    return a;
  },
  async remove(id: string) {
    assertCan(authService.currentUser(), "uploadMedia");
    if (apiEnabled) {
      await apiFetch(`/api/v1/media/${id}/`, { method: "DELETE" });
      await refreshWorkspace();
      return;
    }
    store.update((d) => {
      const a = d.attachments.find((x) => x.id === id);
      if (!a) return;
      d.attachments = d.attachments.filter((x) => x.id !== id);
      d.entries.forEach((e) => {
        e.attachmentIds = e.attachmentIds.filter((x) => x !== id);
      });
      addLog(d, {
        action: "delete",
        targetType: "photo",
        targetId: id,
        siteId: a.siteId,
        summary: `Removed ${a.kind === "photo" ? "photo" : "bill image"} ${a.caption ?? a.name}`,
      });
    });
  },
};
