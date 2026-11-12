/** Register service worker + notification helpers (no Firebase). */

let registration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return registration;
  } catch (e) {
    console.warn("SW registration failed", e);
    return null;
  }
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export async function showReminderNotification(opts: {
  id: string;
  title: string;
  body?: string;
}): Promise<boolean> {
  const perm = await ensureNotificationPermission();
  if (perm !== "granted") return false;

  const payload = {
    type: "SHOW_NOTIFICATION" as const,
    title: opts.title,
    body: opts.body || "Reminder from CuboSites",
    tag: `reminder-${opts.id}`,
    url: "/reminders",
  };

  const reg = registration || (await navigator.serviceWorker.getRegistration());
  if (reg?.active) {
    reg.active.postMessage(payload);
    return true;
  }
  // Fallback when SW not active yet
  new Notification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: "/icons.ico/android-chrome-192x192.png",
  });
  return true;
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function canInstallPrompt(): boolean {
  return typeof window !== "undefined" && "BeforeInstallPromptEvent" in window === false
    ? true
    : true;
}
