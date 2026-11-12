import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ReminderAlarms } from "@/components/app/ReminderAlarms";
import { useCurrentUser } from "@/hooks/use-data";
import { authService } from "@/services/auth";
import { apiEnabled } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const user = useCurrentUser();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (apiEnabled) await authService.restoreSession();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready && !user) nav({ to: "/login" });
  }, [ready, user, nav]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <AppShell>
      <ReminderAlarms />
      <Outlet />
    </AppShell>
  );
}
