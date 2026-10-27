// Core domain types for CubeSites. Money is always integer paise.

export type ID = string;
export type ISODate = string; // yyyy-mm-dd
export type ISODateTime = string;

export type Role = "owner" | "site_manager" | "staff";

export const PERMISSION_KEYS = [
  "viewSite",
  "viewFinancials",
  "createEntries",
  "editEntries",
  "manageItems",
  "uploadMedia",
  "reports",
  "manageStaffSites",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type Permissions = Record<PermissionKey, boolean>;

export interface Account {
  id: ID;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  district: string;
  gstin?: string;
}

export interface User {
  id: ID;
  name: string;
  phone: string;
  email: string;
  role: Role;
  active: boolean;
  permissions: Permissions;
  siteIds: ID[];
  createdAt: ISODateTime;
}

export type SiteStatus = "active" | "completed" | "inactive";

export interface SiteStatusEvent {
  status: SiteStatus;
  at: ISODateTime;
  by: ID;
}

export interface Site {
  id: ID;
  name: string;
  primaryPhone: string;
  altPhone?: string;
  address?: string;
  status: SiteStatus;
  startDate: ISODate;
  statusHistory: SiteStatusEvent[];
  createdAt: ISODateTime;
}

export type ExpenseType = "materials" | "labour" | "equipment" | "other";
export type EntryType = ExpenseType | "payment";

export interface Item {
  id: ID;
  type: ExpenseType;
  name: string;
  normalized: string;
  createdAt: ISODateTime;
}

export interface Entry {
  id: ID;
  siteId: ID;
  type: EntryType;
  itemId?: ID;
  /** Snapshot of item name at save time — never rewritten by renames. */
  description: string;
  quantity?: number;
  unitPricePaise?: number;
  totalPaise: number;
  date: ISODate;
  attachmentIds: ID[];
  createdBy: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type AttachmentKind = "bill" | "photo";

export interface Attachment {
  id: ID;
  siteId: ID;
  entryId?: ID;
  kind: AttachmentKind;
  name: string;
  sizeBytes: number;
  src: string; // data URL (uploaded or generated placeholder)
  caption?: string;
  date: ISODate;
  createdBy: ID;
  createdAt: ISODateTime;
}

export interface ActivityLog {
  id: ID;
  actorId: ID;
  at: ISODateTime;
  action: "create" | "update" | "delete" | "deactivate" | "reactivate" | "complete" | "login";
  targetType: "site" | "entry" | "item" | "staff" | "photo" | "invoice" | "settings" | "session";
  targetId?: ID;
  siteId?: ID;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface StorageSnapshot {
  date: ISODate;
  bytes: number;
}

export interface InvoiceLine {
  label: string;
  detail: string;
  amountPaise: number;
}

export type InvoiceStatus = "paid" | "due" | "pending_approval";

export interface Invoice {
  id: ID;
  number: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  lines: InvoiceLine[];
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  status: InvoiceStatus;
  issuedAt: ISODateTime;
}

export interface BillingPayment {
  id: ID;
  invoiceId: ID;
  amountPaise: number;
  method: "online" | "bank_transfer" | "upi" | "cheque";
  reference: string;
  status: "approved" | "pending_approval" | "rejected";
  at: ISODateTime;
}

export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  at: ISODateTime;
  read: boolean;
}

export type DriveStatus = "not_connected" | "connected" | "expired";

export interface BackupRecord {
  id: ID;
  at: ISODateTime;
  status: "success" | "failed";
  note: string;
}

export interface Settings {
  taxLabel: string;
  taxRatePct: number;
  showTaxBreakup: boolean;
  driveStatus: DriveStatus;
  backups: BackupRecord[];
  notify: { dailySummary: boolean; paymentReceived: boolean; backupFailure: boolean; invoiceDue: boolean };
}

export interface Preferences {
  lastSiteId?: ID;
}

export interface DemoDB {
  version: number;
  account: Account;
  users: User[];
  sites: Site[];
  items: Item[];
  entries: Entry[];
  attachments: Attachment[];
  activity: ActivityLog[];
  storage: StorageSnapshot[];
  invoices: Invoice[];
  billingPayments: BillingPayment[];
  notifications: AppNotification[];
  settings: Settings;
  prefs: Preferences;
}

export interface Session {
  userId: ID;
  startedAt: ISODateTime;
}
