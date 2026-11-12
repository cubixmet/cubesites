import type {
  Account,
  ActivityLog,
  AppNotification,
  Attachment,
  BackupRecord,
  BillingPayment,
  DemoDB,
  Entry,
  Invoice,
  Item,
  Permissions,
  Settings,
  Site,
  User,
} from "@/types";
import { apiFetch } from "@/lib/api";
import { store } from "@/mock/store";

type AnyRec = Record<string, unknown>;

const str = (v: unknown, fallback = "") => (v == null ? fallback : String(v));
const num = (v: unknown, fallback = 0) => (typeof v === "number" ? v : Number(v) || fallback);

function mapUser(u: AnyRec): User {
  return {
    id: str(u.id),
    name: str(u.name) || [u.first_name, u.last_name].filter(Boolean).join(" ") || str(u.email),
    phone: str(u.phone),
    email: str(u.email),
    role: (u.role as User["role"]) || "staff",
    active: u.active !== false && u.is_active !== false,
    permissions: (u.permissions as Permissions) || {
      viewSite: true,
      viewFinancials: false,
      createEntries: true,
      editEntries: false,
      manageItems: false,
      uploadMedia: true,
      reports: false,
      manageStaffSites: false,
    },
    siteIds: ((u.site_ids as string[]) || (u.siteIds as string[]) || []).map(String),
    createdAt: str(u.date_joined || u.createdAt, new Date().toISOString()),
  };
}

function mapAccount(w: AnyRec): Account {
  return {
    id: str(w.id),
    businessName: str(w.business_name || w.businessName),
    ownerName: str(w.owner_name || w.ownerName),
    phone: str(w.phone),
    email: str(w.email),
    district: str(w.district),
    gstin: str(w.gstin) || undefined,
  };
}

function mapSettings(w: AnyRec): Settings {
  const statusRaw = str(w.drive_status || w.driveStatus, "not_connected");
  const driveStatus: Settings["driveStatus"] =
    statusRaw === "connected"
      ? "connected"
      : statusRaw === "expired" || statusRaw === "token_expired"
        ? "expired"
        : "not_connected";
  return {
    taxLabel: str(w.tax_label || w.taxLabel, "GST"),
    taxRatePct: num(w.tax_rate_pct ?? w.taxRatePct, 18),
    showTaxBreakup: w.show_tax_breakup !== false && w.showTaxBreakup !== false,
    driveStatus,
    driveEmail: str(w.drive_email || w.driveEmail) || undefined,
    driveLastBackupAt:
      w.drive_last_backup_at || w.driveLastBackupAt
        ? str(w.drive_last_backup_at || w.driveLastBackupAt)
        : undefined,
    backups: [],
    notify: {
      dailySummary: w.notify_daily_summary !== false,
      paymentReceived: w.notify_payment_received !== false,
      backupFailure: w.notify_backup_failure !== false,
      invoiceDue: w.notify_invoice_due !== false,
    },
  };
}

function mapSite(s: AnyRec): Site {
  const hist = ((s.status_history as AnyRec[]) || (s.statusHistory as AnyRec[]) || []).map((h) => ({
    status: h.status as Site["status"],
    at: str(h.at),
    by: str(h.by),
  }));
  return {
    id: str(s.id),
    name: str(s.name),
    primaryPhone: str(s.primary_phone || s.primaryPhone),
    altPhone: str(s.alt_phone || s.altPhone) || undefined,
    address: str(s.address) || undefined,
    status: (s.status as Site["status"]) || "active",
    startDate: str(s.start_date || s.startDate).slice(0, 10),
    statusHistory: hist,
    createdAt: str(s.created_at || s.createdAt),
  };
}

function mapEntry(e: AnyRec): Entry {
  const unit = e.unit_price_paise ?? e.unitPricePaise;
  const total = e.total_paise ?? e.totalPaise;
  return {
    id: str(e.id),
    siteId: str(e.site_id || e.siteId),
    type: e.type as Entry["type"],
    itemId: e.item_id || e.itemId ? str(e.item_id || e.itemId) : undefined,
    description: str(e.description),
    quantity: e.quantity == null ? undefined : num(e.quantity),
    // API nulls money when caller lacks viewFinancials — treat as hidden (0).
    unitPricePaise: unit == null ? undefined : num(unit),
    totalPaise: total == null ? 0 : num(total),
    date: str(e.date).slice(0, 10),
    attachmentIds: ((e.attachment_ids as string[]) || (e.attachmentIds as string[]) || []).map(
      String,
    ),
    createdBy: str(e.created_by || e.createdBy),
    createdAt: str(e.created_at || e.createdAt),
    updatedAt: str(e.updated_at || e.updatedAt),
  };
}

function mapItem(i: AnyRec): Item {
  return {
    id: str(i.id),
    type: i.type as Item["type"],
    name: str(i.name),
    normalized: str(i.normalized || i.name).toLowerCase(),
    createdAt: str(i.created_at || i.createdAt),
  };
}

function mapAttachment(a: AnyRec): Attachment {
  return {
    id: str(a.id),
    siteId: str(a.site_id || a.siteId),
    entryId: a.entry_id || a.entryId ? str(a.entry_id || a.entryId) : undefined,
    kind: a.kind as Attachment["kind"],
    name: str(a.name),
    sizeBytes: num(a.size_bytes ?? a.sizeBytes),
    src: str(a.src),
    caption: str(a.caption) || undefined,
    date: str(a.date).slice(0, 10),
    createdBy: str(a.created_by || a.createdBy),
    createdAt: str(a.created_at || a.createdAt),
  };
}

function mapInvoice(i: AnyRec): Invoice {
  return {
    id: str(i.id),
    number: str(i.number),
    periodStart: str(i.periodStart || i.period_start).slice(0, 10),
    periodEnd: str(i.periodEnd || i.period_end).slice(0, 10),
    lines: ((i.lines as AnyRec[]) || []).map((l) => ({
      label: str(l.label),
      detail: str(l.detail),
      amountPaise: num(l.amountPaise ?? l.amount_paise),
    })),
    subtotalPaise: num(i.subtotalPaise ?? i.subtotal_paise),
    taxPaise: num(i.taxPaise ?? i.tax_paise),
    totalPaise: num(i.totalPaise ?? i.total_paise),
    status: (i.status as Invoice["status"]) || "due",
    issuedAt: str(i.issuedAt || i.issued_at),
  };
}

function mapActivity(a: AnyRec): ActivityLog {
  return {
    id: str(a.id),
    actorId: str(a.actorId || a.actor_id),
    at: str(a.at),
    action: a.action as ActivityLog["action"],
    targetType: a.targetType || a.target_type,
    targetId: a.targetId || a.target_id ? str(a.targetId || a.target_id) : undefined,
    siteId: a.siteId || a.site_id ? str(a.siteId || a.site_id) : undefined,
    summary: str(a.summary),
    before: (a.before as Record<string, unknown>) || undefined,
    after: (a.after as Record<string, unknown>) || undefined,
  } as ActivityLog;
}

function mapNotification(n: AnyRec): AppNotification {
  return {
    id: str(n.id),
    title: str(n.title),
    body: str(n.body),
    at: str(n.at),
    read: Boolean(n.read),
  };
}

function emptyDb(account: Account, users: User[], settings: Settings): DemoDB {
  return {
    version: 1,
    account,
    users,
    sites: [],
    items: [],
    entries: [],
    attachments: [],
    activity: [],
    storage: [],
    invoices: [],
    billingPayments: [],
    wallet: { balancePaise: 0, paidRechargedPaise: 0, freeRechargedPaise: 0, transactions: [] },
    notes: [],
    reminders: [],
    notifications: [],
    settings,
    prefs: {},
  };
}

/** Pull contractor workspace data from Django into the local DemoDB-shaped store. */
export async function hydrateFromApi(meUser?: User, workspace?: AnyRec): Promise<DemoDB> {
  const me = meUser
    ? { user: meUser, workspace }
    : await apiFetch<{ user: AnyRec; workspace: AnyRec }>("/api/auth/me/");

  const user = meUser || mapUser(me.user as AnyRec);
  const wsRaw = (workspace || me.workspace) as AnyRec;
  if (!wsRaw) throw new Error("No workspace on this account.");

  const account = mapAccount(wsRaw);
  const settings = mapSettings(wsRaw);

  const empty = () => [] as AnyRec[];
  const [
    sites,
    staff,
    items,
    entries,
    media,
    invoices,
    activity,
    notifications,
    billing,
    walletRaw,
    notesRaw,
    remindersRaw,
    driveRaw,
  ] = await Promise.all([
    apiFetch<AnyRec[]>("/api/v1/sites/").catch(empty),
    apiFetch<AnyRec[]>("/api/v1/staff/").catch(empty),
    apiFetch<AnyRec[]>("/api/v1/items/").catch(empty),
    apiFetch<AnyRec[]>("/api/v1/entries/").catch(empty),
    apiFetch<AnyRec[]>("/api/v1/media/").catch(empty),
    apiFetch<AnyRec[]>("/api/v1/invoices/").catch(empty),
    apiFetch<AnyRec[]>("/api/v1/activity/").catch(empty),
    apiFetch<AnyRec[]>("/api/v1/notifications/").catch(empty),
    apiFetch<AnyRec>("/api/v1/billing/current/").catch(() => null),
    apiFetch<AnyRec>("/api/v1/wallet/").catch(() => null),
    apiFetch<AnyRec[]>("/api/v1/notes/").catch(empty),
    apiFetch<AnyRec[]>("/api/v1/reminders/").catch(empty),
    apiFetch<AnyRec>("/api/v1/drive/").catch(() => null),
  ]);

  const users = [user, ...staff.map(mapUser).filter((s) => s.id !== user.id)];
  // Ensure owner is present once
  if (user.role === "owner" && !users.some((u) => u.id === user.id)) users.unshift(user);

  const db = emptyDb(account, users, settings);
  db.sites = sites.map(mapSite);
  db.items = items.map(mapItem);
  db.entries = entries.map(mapEntry);
  db.attachments = media.map(mapAttachment);
  db.invoices = invoices.map(mapInvoice);
  db.activity = activity.map(mapActivity);
  db.notifications = notifications.map(mapNotification);
  db.billingPayments = [];
  if (billing && Array.isArray((billing as AnyRec).snapshots)) {
    db.storage = ((billing as AnyRec).snapshots as AnyRec[]).map((s) => ({
      date: str(s.date).slice(0, 10),
      bytes: num(s.bytes),
    }));
  }
  if (walletRaw && (walletRaw as AnyRec).wallet) {
    const w = (walletRaw as AnyRec).wallet as AnyRec;
    const txs = Array.isArray((walletRaw as AnyRec).transactions)
      ? ((walletRaw as AnyRec).transactions as AnyRec[])
      : [];
    db.wallet = {
      balancePaise: num(w.balancePaise),
      paidRechargedPaise: num(w.paidRechargedPaise),
      freeRechargedPaise: num(w.freeRechargedPaise),
      transactions: txs.map((t) => ({
        id: str(t.id),
        amountPaise: num(t.amountPaise),
        kind: (str(t.kind, "recharge") as "recharge" | "debit" | "adjustment") || "recharge",
        funding: (str(t.funding, "paid") as "free" | "paid") || "paid",
        source: (str(t.source, "admin") as "admin" | "razorpay" | "system") || "admin",
        note: str(t.note),
        reference: str(t.reference),
        balanceAfterPaise: num(t.balanceAfterPaise),
        countsAsIncome: Boolean(t.countsAsIncome),
        at: str(t.createdAt),
      })),
    };
  }
  db.notes = notesRaw.map((n) => ({
    id: str(n.id),
    siteId: n.siteId ? str(n.siteId) : undefined,
    title: str(n.title),
    body: str(n.body),
    pinned: Boolean(n.pinned),
    createdBy: n.createdBy ? str(n.createdBy) : undefined,
    createdAt: str(n.createdAt),
    updatedAt: str(n.updatedAt),
  }));
  db.reminders = remindersRaw.map((r) => ({
    id: str(r.id),
    siteId: r.siteId ? str(r.siteId) : undefined,
    title: str(r.title),
    body: str(r.body),
    dueAt: str(r.dueAt),
    done: Boolean(r.done),
    notifiedAt: r.notifiedAt ? str(r.notifiedAt) : undefined,
    createdBy: r.createdBy ? str(r.createdBy) : undefined,
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  }));
  if (driveRaw) {
    const st = str((driveRaw as AnyRec).status, db.settings.driveStatus);
    db.settings.driveStatus =
      st === "connected"
        ? "connected"
        : st === "expired" || st === "token_expired"
          ? "expired"
          : "not_connected";
    db.settings.driveEmail = str((driveRaw as AnyRec).email) || undefined;
    db.settings.driveLastBackupAt = (driveRaw as AnyRec).lastBackupAt
      ? str((driveRaw as AnyRec).lastBackupAt)
      : undefined;
    const backups = Array.isArray((driveRaw as AnyRec).backups)
      ? ((driveRaw as AnyRec).backups as AnyRec[])
      : [];
    db.settings.backups = backups.map((b) => ({
      id: str(b.id),
      at: str(b.at),
      status: (str(b.status, "failed") as BackupRecord["status"]) || "failed",
      note: str(b.note),
      jobType: str(b.jobType) || undefined,
      sizeBytes: b.sizeBytes != null ? num(b.sizeBytes) : undefined,
    }));
  }
  db.prefs = { lastSiteId: undefined };

  store.replace(db);
  return db;
}

export async function refreshWorkspace() {
  await hydrateFromApi();
}

export type { BillingPayment };
