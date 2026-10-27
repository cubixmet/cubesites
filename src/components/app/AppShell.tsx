import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Activity, Bell, Building2, CreditCard, FileBarChart, Home, Images, LogOut, Menu, Plus, Settings, Users, Wallet, ListChecks } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { authService } from "@/services/auth";
import { notificationService } from "@/services/account";
import { can } from "@/services/core";
import { formatDateTime, ROLE_LABEL } from "@/lib/format";
import type { PermissionKey } from "@/types";

const NAV: { to: string; label: string; icon: typeof Home; perm?: PermissionKey }[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/sites", label: "Sites", icon: Building2 },
  { to: "/entries", label: "Entries", icon: ListChecks },
  { to: "/payments", label: "Client payments", icon: Wallet, perm: "viewFinancials" },
  { to: "/photos", label: "Photos", icon: Images },
  { to: "/staff", label: "Staff", icon: Users, perm: "manageStaffSites" },
  { to: "/reports", label: "Reports", icon: FileBarChart, perm: "reports" },
  { to: "/activity", label: "Activity log", icon: Activity },
  { to: "/subscription", label: "Subscription", icon: CreditCard, perm: "manageStaffSites" },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const navFor = (u: ReturnType<typeof useCurrentUser>) => NAV.filter((n) => !n.perm || can(u, n.perm));

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg font-semibold", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 2 3 7v10l9 5 9-5V7z" /><path d="M3 7l9 5 9-5M12 12v10" /></svg>
      </span>
      CubeSites
    </span>
  );
}

function UserMenu() {
  const user = useCurrentUser();
  const nav = useNavigate();
  if (!user) return null;
  const initials = user.name.split(" ").map((s) => s[0]).join("").slice(0, 2);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="grid size-10 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Profile menu">{initials}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel><p className="font-semibold">{user.name}</p><p className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[user.role]} · {user.email}</p></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => nav({ to: "/settings" })}><Settings /> Account settings</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => { authService.logout(); nav({ to: "/login" }); }}><LogOut /> Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Notifications() {
  const db = useDb();
  const unread = db.notifications.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications (${unread} unread)`} className="relative">
          <Bell className="!size-5" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button size="sm" variant="ghost" disabled={!unread} onClick={() => notificationService.markAllRead()}>Mark all read</Button>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {db.notifications.length === 0 && <li className="p-4 text-sm text-muted-foreground">You're all caught up.</li>}
          {db.notifications.map((n) => (
            <li key={n.id}>
              <button onClick={() => notificationService.markRead(n.id)} className={cn("block w-full px-3 py-2.5 text-left hover:bg-muted", !n.read && "bg-accent/40")}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.at)}</p>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const db = useDb();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = navFor(user);
  const active = (to: string) => path === to || path.startsWith(to + "/");
  const title = items.find((n) => active(n.to))?.label ?? (path.startsWith("/entry") ? "New entry" : path.startsWith("/more") ? "More" : "");

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/dashboard" className="mb-6 px-2"><Logo /></Link>
        {can(user, "createEntries") && <Button asChild size="lg" className="mb-4"><Link to="/entry/new"><Plus /> Add entry</Link></Button>}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", active(to) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-muted")}>
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 rounded-lg border bg-card p-3 text-xs">
          <p className="truncate font-semibold">{db.account.businessName}</p>
          <p className="text-muted-foreground">Demo workspace · {db.account.district}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <Link to="/dashboard" className="md:hidden"><Logo /></Link>
          <p className="hidden text-sm font-medium text-muted-foreground md:block">{title}</p>
          <div className="ml-auto flex items-center gap-1">
            <Notifications />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">{children}</main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card md:hidden" aria-label="Primary">
        {[
          { to: "/dashboard", label: "Home", icon: Home },
          { to: "/sites", label: "Sites", icon: Building2 },
          { to: "/entry/new", label: "Add Entry", icon: Plus, primary: true },
          { to: "/more", label: "More", icon: Menu },
        ].map(({ to, label, icon: Icon, primary }) => (
          <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 pt-2 text-[11px] font-semibold", active(to) ? "text-primary" : "text-muted-foreground")}>
            {primary ? <span className="-mt-5 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"><Icon className="size-6" /></span> : <Icon className="size-5" />}
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
