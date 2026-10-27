// Indian locale formatting helpers.
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrShort = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatINR = (paise: number) => inr.format(paise / 100);
export const formatINRShort = (paise: number) => inrShort.format(Math.round(paise / 100));

export const formatDate = (iso: string) => {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
};

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const ENTRY_TYPE_LABEL: Record<string, string> = {
  materials: "Materials",
  labour: "Labour",
  equipment: "Equipment",
  other: "Other expense",
  payment: "Client payment",
};

export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  site_manager: "Site Manager",
  staff: "Staff",
};

export const PERMISSION_LABEL: Record<string, string> = {
  viewSite: "View site details",
  viewFinancials: "View financial totals",
  createEntries: "Create entries",
  editEntries: "Edit or delete entries",
  manageItems: "Manage reusable items",
  uploadMedia: "Upload photos & bills",
  reports: "View & export reports",
  manageStaffSites: "Manage staff & site settings",
};
