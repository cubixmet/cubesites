import { useEffect, useRef } from "react";
import { useDb } from "@/hooks/use-data";
import { reminderService } from "@/services/notes";
import {
  ensureNotificationPermission,
  registerServiceWorker,
  showReminderNotification,
} from "@/lib/pwa";

/** Schedules OS notifications for open reminders while the PWA/session is alive. */
export function ReminderAlarms() {
  const db = useDb();
  const timers = useRef<Map<string, number>>(new Map());
  const firing = useRef<Set<string>>(new Set());

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const clearAll = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current.clear();
    };

    const fire = async (id: string, title: string, body: string) => {
      if (cancelled || firing.current.has(id)) return;
      firing.current.add(id);
      try {
        await showReminderNotification({ id, title: `Reminder: ${title}`, body });
        await reminderService.markNotified(id);
      } catch (e) {
        console.warn("Reminder notify failed", e);
      } finally {
        firing.current.delete(id);
      }
    };

    const schedule = async () => {
      clearAll();
      const open = (db.reminders || []).filter((r) => !r.done && !r.notifiedAt);
      if (open.length === 0) return;
      // Ask once when there are upcoming alarms
      if (open.some((r) => new Date(r.dueAt).getTime() - Date.now() < 7 * 86400_000)) {
        await ensureNotificationPermission();
      }
      const now = Date.now();
      for (const r of open) {
        const due = new Date(r.dueAt).getTime();
        const delay = due - now;
        if (delay <= 0) {
          void fire(r.id, r.title, r.body);
          continue;
        }
        // setTimeout max ~24.8 days; clamp for far-future
        const capped = Math.min(delay, 2147483647);
        const handle = window.setTimeout(() => {
          void fire(r.id, r.title, r.body);
        }, capped);
        timers.current.set(r.id, handle);
      }
    };

    void schedule();
    const onFocus = () => void schedule();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      clearAll();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [db.reminders]);

  return null;
}
