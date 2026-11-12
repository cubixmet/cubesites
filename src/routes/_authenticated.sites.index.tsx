import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, MoreVertical, Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, PageHeader, StatusBadge } from "@/components/app/common";
import { SiteFormDialog, SiteStatusDialog } from "@/components/app/SiteDialogs";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { siteQueries } from "@/services/sites";
import { can } from "@/services/core";
import { formatDate, formatINRShort } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import type { Site, SiteStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/sites/")({
  head: pageHead(
    "Sites",
    "Manage your construction sites — create, edit, complete and reactivate.",
  ),
  component: Sites,
});

function Sites() {
  const db = useDb();
  const user = useCurrentUser();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SiteStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Site | undefined>();
  const [statusTarget, setStatusTarget] = useState<{ site: Site; to: SiteStatus } | null>(null);
  const sites = siteQueries.list(db, { q, status });
  const manage = can(user, "manageStaffSites");
  const fin = can(user, "viewFinancials");

  const actions = (s: Site) =>
    manage && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${s.name}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setEditing(s);
              setFormOpen(true);
            }}
          >
            Edit details
          </DropdownMenuItem>
          {s.status !== "completed" && (
            <DropdownMenuItem onSelect={() => setStatusTarget({ site: s, to: "completed" })}>
              Mark completed
            </DropdownMenuItem>
          )}
          {s.status !== "inactive" && (
            <DropdownMenuItem onSelect={() => setStatusTarget({ site: s, to: "inactive" })}>
              Mark inactive
            </DropdownMenuItem>
          )}
          {s.status !== "active" && (
            <DropdownMenuItem onSelect={() => setStatusTarget({ site: s, to: "active" })}>
              Reactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );

  return (
    <>
      <PageHeader
        title="Sites"
        subtitle={`${sites.length} shown`}
        actions={
          manage && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus /> New site
            </Button>
          )
        }
      />
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            placeholder="Search by name or address"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search sites"
          />
        </div>
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as SiteStatus | "all")}
          className="min-w-0 max-w-full"
        >
          <TabsList className="h-10 w-full max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {sites.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="No sites found"
          body={
            q || status !== "all"
              ? "Try a different search or status."
              : "Create a site to start recording entries."
          }
          action={
            manage && !q ? (
              <Button onClick={() => setFormOpen(true)}>
                <Plus /> New site
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {sites.map((s) => {
              const t = siteQueries.totals(db, s.id);
              return (
                <div key={s.id} className="rounded-xl border bg-card p-4 shadow-card">
                  <div className="flex items-start gap-2">
                    <Link to="/sites/$siteId" params={{ siteId: s.id }} className="min-w-0 flex-1">
                      <p className="font-semibold">{s.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" />
                        {s.primaryPhone}
                      </p>
                    </Link>
                    <StatusBadge status={s.status} />
                    {actions(s)}
                  </div>
                  {fin && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Expenses</p>
                        <p className="font-semibold tabular">{formatINRShort(t.expenses)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Received</p>
                        <p className="font-semibold tabular text-income">
                          {formatINRShort(t.payments)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Net</p>
                        <p
                          className={`font-semibold tabular ${t.net >= 0 ? "text-income" : "text-expense"}`}
                        >
                          {formatINRShort(t.net)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden max-w-full overflow-x-auto overscroll-x-contain rounded-xl border bg-card md:block">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  {fin && (
                    <>
                      <th className="px-4 py-3 text-right">Expenses</th>
                      <th className="px-4 py-3 text-right">Received</th>
                      <th className="px-4 py-3 text-right">Net</th>
                    </>
                  )}
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sites.map((s) => {
                  const t = siteQueries.totals(db, s.id);
                  return (
                    <tr key={s.id} className="hover:bg-muted/40">
                      <td className="max-w-[14rem] px-4 py-3">
                        <Link
                          to="/sites/$siteId"
                          params={{ siteId: s.id }}
                          className="font-semibold hover:text-primary"
                        >
                          {s.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{s.address}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular">{s.primaryPhone}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(s.startDate)}</td>
                      {fin && (
                        <>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular">
                            {formatINRShort(t.expenses)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular text-income">
                            {formatINRShort(t.payments)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular ${t.net >= 0 ? "text-income" : "text-expense"}`}
                          >
                            {formatINRShort(t.net)}
                          </td>
                        </>
                      )}
                      <td className="px-2">{actions(s)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <SiteFormDialog open={formOpen} onOpenChange={setFormOpen} site={editing} />
      <SiteStatusDialog
        site={statusTarget?.site ?? null}
        target={statusTarget?.to ?? null}
        onOpenChange={(o) => !o && setStatusTarget(null)}
      />
    </>
  );
}
