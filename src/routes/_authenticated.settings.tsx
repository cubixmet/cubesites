import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, Panel, PanelTitle } from "@/components/app/common";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { demoService, driveService, settingsService } from "@/services/account";
import { can } from "@/services/core";
import { formatDateTime } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { refreshWorkspace } from "@/services/sync";
import type { DriveStatus } from "@/types";

const SETTINGS_TABS = ["profile", "workspace", "tax", "drive", "notify", "demo"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

export const Route = createFileRoute("/_authenticated/settings")({
  head: pageHead(
    "Settings",
    "Profile, workspace, tax display, Google Drive backup and notification settings.",
  ),
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: SettingsTab; drive?: string; reason?: string } => ({
    tab: SETTINGS_TABS.includes(s.tab as SettingsTab) ? (s.tab as SettingsTab) : undefined,
    drive: typeof s.drive === "string" ? s.drive : undefined,
    reason: typeof s.reason === "string" ? s.reason : undefined,
  }),
  component: SettingsPage,
});

function Save({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <Button className="mt-4" disabled={busy} onClick={onClick}>
      {busy && <Loader2 className="animate-spin" />}Save
    </Button>
  );
}

function SettingsPage() {
  const db = useDb();
  const user = useCurrentUser()!;
  const nav = useNavigate({ from: "/settings" });
  const search = Route.useSearch();
  const owner = can(user, "manageStaffSites");
  const [busy, setBusy] = useState("");
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone });
  const [ws, setWs] = useState({
    businessName: db.account.businessName,
    district: db.account.district,
    gstin: db.account.gstin ?? "",
  });
  const [tax, setTax] = useState({
    taxLabel: db.settings.taxLabel,
    taxRatePct: String(db.settings.taxRatePct),
    showTaxBreakup: db.settings.showTaxBreakup,
  });
  const run = async (k: string, fn: () => Promise<void>, msg: string) => {
    setBusy(k);
    try {
      await fn();
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const drive = db.settings.driveStatus;
  const DRIVE_LABEL: Record<DriveStatus, string> = {
    not_connected: "Not connected",
    connected: "Connected",
    expired: "Connection expired",
  };
  const tab =
    search.tab &&
    (owner || search.tab === "profile" || search.tab === "notify" || search.tab === "demo")
      ? search.tab
      : "profile";

  useEffect(() => {
    if (search.drive === "connected") {
      toast.success("Google Drive connected");
      void refreshWorkspace();
      nav({ search: { tab: "drive" }, replace: true });
    } else if (search.drive === "error") {
      toast.error(search.reason || "Google Drive connection failed");
      nav({ search: { tab: "drive" }, replace: true });
    }
  }, [search.drive, search.reason, nav]);

  return (
    <>
      <PageHeader title="Settings" />
      <Tabs
        value={tab}
        onValueChange={(v) => nav({ search: { tab: v as SettingsTab }, replace: true })}
      >
        <TabsList className="h-11 w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {owner && <TabsTrigger value="workspace">Workspace</TabsTrigger>}
          {owner && <TabsTrigger value="tax">Tax</TabsTrigger>}
          {owner && <TabsTrigger value="drive">Google Drive</TabsTrigger>}
          <TabsTrigger value="notify">Notifications</TabsTrigger>
          <TabsTrigger value="demo">Demo data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Panel className="max-w-lg">
            <PanelTitle>Your profile</PanelTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pn">Name</Label>
                <Input
                  id="pn"
                  className="mt-1.5 h-11"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pp">Phone</Label>
                <Input
                  id="pp"
                  className="mt-1.5 h-11"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-1.5 h-11" value={user.email} disabled />
              </div>
            </div>
            <Save
              busy={busy === "p"}
              onClick={() =>
                run("p", () => settingsService.updateProfile(user.id, profile), "Profile saved")
              }
            />
          </Panel>
        </TabsContent>

        {owner && (
          <TabsContent value="workspace" className="mt-4">
            <Panel className="max-w-lg">
              <PanelTitle>Workspace</PanelTitle>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bn">Business name</Label>
                  <Input
                    id="bn"
                    className="mt-1.5 h-11"
                    value={ws.businessName}
                    onChange={(e) => setWs({ ...ws, businessName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ds">District</Label>
                  <Input
                    id="ds"
                    className="mt-1.5 h-11"
                    value={ws.district}
                    onChange={(e) => setWs({ ...ws, district: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gs">GSTIN (optional)</Label>
                  <Input
                    id="gs"
                    className="mt-1.5 h-11"
                    value={ws.gstin}
                    onChange={(e) => setWs({ ...ws, gstin: e.target.value.toUpperCase() })}
                    maxLength={15}
                  />
                </div>
              </div>
              <Save
                busy={busy === "w"}
                onClick={() =>
                  run(
                    "w",
                    () => settingsService.updateAccount({ ...ws, gstin: ws.gstin || undefined }),
                    "Workspace saved",
                  )
                }
              />
              <p className="mt-4 text-sm text-muted-foreground">
                Staff permissions are managed on the{" "}
                <Link to="/staff" className="font-semibold text-primary">
                  Staff page
                </Link>
                ; billing on{" "}
                <Link to="/subscription" className="font-semibold text-primary">
                  Subscription
                </Link>
                .
              </p>
            </Panel>
          </TabsContent>
        )}

        {owner && (
          <TabsContent value="tax" className="mt-4">
            <Panel className="max-w-lg">
              <PanelTitle>Tax display</PanelTitle>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tl">Tax label</Label>
                  <Input
                    id="tl"
                    className="mt-1.5 h-11"
                    value={tax.taxLabel}
                    onChange={(e) => setTax({ ...tax, taxLabel: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tr">Rate %</Label>
                  <Input
                    id="tr"
                    inputMode="decimal"
                    className="mt-1.5 h-11"
                    value={tax.taxRatePct}
                    onChange={(e) => setTax({ ...tax, taxRatePct: e.target.value })}
                  />
                </div>
              </div>
              <label className="mt-3 flex items-center justify-between text-sm">
                Show tax breakup on invoices
                <Switch
                  checked={tax.showTaxBreakup}
                  onCheckedChange={(c) => setTax({ ...tax, showTaxBreakup: c })}
                />
              </label>
              <Save
                busy={busy === "t"}
                onClick={() => {
                  const r = Number(tax.taxRatePct);
                  if (!tax.taxLabel.trim() || !Number.isFinite(r) || r < 0 || r > 50) {
                    toast.error("Enter a label and a rate between 0 and 50.");
                    return;
                  }
                  run(
                    "t",
                    () =>
                      settingsService.update({
                        taxLabel: tax.taxLabel.trim(),
                        taxRatePct: r,
                        showTaxBreakup: tax.showTaxBreakup,
                      }),
                    "Tax settings saved",
                  );
                }}
              />
            </Panel>
          </TabsContent>
        )}

        {owner && (
          <TabsContent value="drive" className="mt-4">
            <Panel className="max-w-2xl">
              <PanelTitle>Google Drive backup</PanelTitle>
              <p className="text-sm">
                Status: <b>{DRIVE_LABEL[drive]}</b>
                {db.settings.driveEmail ? <> · {db.settings.driveEmail}</> : null}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your Google account to store a monthly workspace backup in a{" "}
                <b>CuboSites Backups</b> folder. Each new backup replaces the previous file so Drive
                only keeps the latest copy. You can also run a backup any time.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {drive !== "connected" ? (
                  <Button
                    size="sm"
                    disabled={busy === "drive"}
                    onClick={() =>
                      run(
                        "drive",
                        async () => {
                          const url = await driveService.connectUrl();
                          window.location.href = url;
                        },
                        "Redirecting to Google…",
                      )
                    }
                  >
                    {busy === "drive" && <Loader2 className="animate-spin" />}
                    Connect Google Drive
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      disabled={busy === "backup"}
                      onClick={() =>
                        run(
                          "backup",
                          async () => {
                            await driveService.runBackup();
                          },
                          "Backup uploaded to Google Drive",
                        )
                      }
                    >
                      {busy === "backup" && <Loader2 className="animate-spin" />}
                      Backup now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === "disc"}
                      onClick={() =>
                        run("disc", () => driveService.disconnect(), "Google Drive disconnected")
                      }
                    >
                      Disconnect
                    </Button>
                  </>
                )}
                {drive === "expired" && (
                  <Button
                    size="sm"
                    variant="soft"
                    disabled={busy === "drive"}
                    onClick={() =>
                      run(
                        "drive",
                        async () => {
                          const url = await driveService.connectUrl();
                          window.location.href = url;
                        },
                        "Redirecting to Google…",
                      )
                    }
                  >
                    Reconnect
                  </Button>
                )}
              </div>
              {drive === "expired" && (
                <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  Connection expired — reconnect Google Drive so monthly and manual backups can run.
                </p>
              )}
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-surface p-3">
                  <p className="font-semibold">Last successful backup</p>
                  <p className="text-muted-foreground">
                    {db.settings.driveLastBackupAt ||
                    db.settings.backups.find((b) => b.status === "success")
                      ? formatDateTime(
                          db.settings.driveLastBackupAt ||
                            db.settings.backups.find((b) => b.status === "success")!.at,
                        )
                      : "None yet"}
                  </p>
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <p className="font-semibold">Schedule</p>
                  <p className="text-muted-foreground">
                    Automatic monthly backup (keeps one file). Triggered by server cron + Backup
                    now.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold">Backup history</p>
              {db.settings.backups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No backups yet.</p>
              ) : (
                <ul className="mt-2 divide-y rounded-lg border text-sm">
                  {db.settings.backups.slice(0, 12).map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2"
                    >
                      <span>
                        <span
                          className={
                            b.status === "success"
                              ? "font-medium text-income"
                              : "font-medium text-destructive"
                          }
                        >
                          {b.status}
                        </span>
                        {b.jobType ? ` · ${b.jobType}` : ""}
                        {b.sizeBytes != null ? ` · ${(b.sizeBytes / 1024).toFixed(1)} KB` : ""}
                        {b.note ? ` · ${b.note}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(b.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </TabsContent>
        )}

        <TabsContent value="notify" className="mt-4">
          <Panel className="max-w-lg">
            <PanelTitle>Notifications</PanelTitle>
            {(
              [
                ["dailySummary", "Daily site summary"],
                ["paymentReceived", "Client payment recorded"],
                ["backupFailure", "Backup failures"],
                ["invoiceDue", "Invoice due reminders"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex items-center justify-between py-2 text-sm">
                {l}
                <Switch
                  checked={db.settings.notify[k]}
                  onCheckedChange={(c) =>
                    run(
                      "n",
                      () => settingsService.update({ notify: { ...db.settings.notify, [k]: c } }),
                      "Saved",
                    )
                  }
                />
              </label>
            ))}
            <p className="mt-2 text-xs text-muted-foreground">
              Delivery (SMS/email/push) requires the backend; preferences are stored for later.
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="demo" className="mt-4">
          <Panel className="max-w-lg">
            <PanelTitle>Demo data</PanelTitle>
            <p className="text-sm text-muted-foreground">
              All data in this demo is generated and stored only in this browser. Resetting restores
              the original sample workspace.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="mt-4 text-destructive">
                  Reset demo data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your changes, uploads and logs in this browser will be replaced by fresh sample
                    data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      demoService.reset();
                      toast.success("Demo data reset");
                    }}
                  >
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Panel>
        </TabsContent>
      </Tabs>
      <p className="mt-8 text-sm text-muted-foreground">
        <Link to="/privacy" className="text-primary hover:underline">
          Privacy Policy & Terms of Use
        </Link>
      </p>
    </>
  );
}
