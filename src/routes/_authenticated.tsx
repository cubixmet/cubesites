import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useCurrentUser } from "@/hooks/use-data";

// Demo session gate (client-only). Real authorization must happen on the backend.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const user = useCurrentUser();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => { if (ready && !user) nav({ to: "/login" }); }, [ready, user, nav]);
  if (!ready || !user) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  return <AppShell><Outlet /></AppShell>;
}
