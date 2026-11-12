import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/common";
import { navFor } from "@/components/app/AppShell";
import { useCurrentUser } from "@/hooks/use-data";
import { authService } from "@/services/auth";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/more")({
  head: pageHead("More", "Staff, reports, subscription and settings."),
  component: More,
});

function More() {
  const user = useCurrentUser();
  const nav = useNavigate();
  const items = navFor(user).filter((n) => n.to !== "/dashboard" && n.to !== "/sites");
  return (
    <>
      <PageHeader title="More" />
      <ul className="divide-y rounded-xl border bg-card">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 px-4 py-4 font-medium hover:bg-muted">
              <Icon className="size-5 text-primary" />
              {label}
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/privacy"
            className="flex items-center gap-3 px-4 py-4 font-medium hover:bg-muted"
          >
            <FileText className="size-5 text-primary" />
            Privacy & Terms
            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
        </li>
      </ul>
      <Button
        variant="outline"
        size="lg"
        className="mt-5 w-full"
        onClick={() => {
          authService.logout();
          nav({ to: "/login" });
        }}
      >
        <LogOut /> Log out
      </Button>
    </>
  );
}
