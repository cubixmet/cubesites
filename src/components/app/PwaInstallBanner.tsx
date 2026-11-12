import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStandalonePwa } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "cubosites.pwa.install.dismissed";

export function PwaInstallBanner() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalonePwa()) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    // iOS: show soft tip if not standalone
    const ua = navigator.userAgent;
    if (
      /iPhone|iPad|iPod/.test(ua) &&
      !(navigator as Navigator & { standalone?: boolean }).standalone
    ) {
      setHidden(false);
    }
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
    setHidden(true);
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
      <Download className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Install CuboSites</p>
        <p className="text-xs text-muted-foreground">
          {evt
            ? "Add to your home screen for faster access and reminder alarms."
            : "On iPhone: Share → Add to Home Screen. Reminder alarms need notification permission."}
        </p>
        {evt && (
          <Button size="sm" className="mt-2" onClick={install}>
            Install app
          </Button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        className="rounded p-1 text-muted-foreground hover:bg-muted"
        onClick={dismiss}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
