// Demo-only data generator. Produces a realistic Kerala contractor workspace.
// Never imported by UI components — only by the mock store.
import type {
  Attachment,
  DemoDB,
  Entry,
  ExpenseType,
  Item,
  Permissions,
  Site,
  StorageSnapshot,
  User,
  ActivityLog,
} from "@/types";
import { PERMISSION_KEYS } from "@/types";

let seed = 20261027;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const int = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

const iso = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const PLACES = [
  "Kakkanad",
  "Edappally",
  "Thrissur East",
  "Pattom",
  "Kottayam Town",
  "Palarivattom",
  "Aluva",
  "Kozhikode Beach Rd",
  "Tripunithura",
  "Kazhakkoottam",
];
const PROJECT = [
  "Residence",
  "Villa",
  "Commercial Complex",
  "Apartment Block",
  "Clinic",
  "School Annex",
  "Renovation",
];
const FIRST = [
  "Anil",
  "Suresh",
  "Biju",
  "Rajesh",
  "Shaji",
  "Joseph",
  "Thomas",
  "Faisal",
  "Pradeep",
  "Vinod",
  "Sreeja",
  "Manoj",
  "Rahul",
  "Nisha",
  "Abdul",
];
const LAST = [
  "Kumar",
  "Nair",
  "Menon",
  "Varghese",
  "Pillai",
  "Mathew",
  "K",
  "Raj",
  "Thomas",
  "Joseph",
];
const DISTRICTS = ["Ernakulam", "Thrissur", "Thiruvananthapuram", "Kottayam", "Kozhikode"];

const ITEM_POOL: Record<ExpenseType, { name: string; unit: [number, number] }[]> = {
  materials: [
    { name: "Cement (OPC 53, bag)", unit: [390, 440] },
    { name: "M-Sand (cft)", unit: [55, 75] },
    { name: "P-Sand (cft)", unit: [65, 85] },
    { name: "Laterite Stone", unit: [38, 55] },
    { name: "TMT Steel 12mm (kg)", unit: [62, 74] },
    { name: 'Hollow Bricks 6"', unit: [32, 42] },
    { name: "Jelly 20mm (cft)", unit: [45, 60] },
    { name: "Roof Tiles (Mangalore)", unit: [28, 40] },
    { name: 'PVC Pipe 4"', unit: [480, 650] },
    { name: "Vitrified Tiles (box)", unit: [850, 1300] },
  ],
  labour: [
    { name: "Mason (daily wage)", unit: [1100, 1300] },
    { name: "Helper (daily wage)", unit: [800, 950] },
    { name: "Carpenter", unit: [1150, 1350] },
    { name: "Electrician", unit: [1100, 1400] },
    { name: "Plumber", unit: [1000, 1300] },
    { name: "Bar Bender", unit: [1100, 1250] },
  ],
  equipment: [
    { name: "JCB Hire (hour)", unit: [1100, 1500] },
    { name: "Concrete Mixer Rent (day)", unit: [900, 1200] },
    { name: "Scaffolding Rent (day)", unit: [400, 700] },
    { name: "Tipper Lorry Trip", unit: [2500, 4000] },
  ],
  other: [
    { name: "Panchayat Permit Fees", unit: [2000, 8000] },
    { name: "Site Tea & Snacks", unit: [150, 400] },
    { name: "Transport / Auto Charges", unit: [200, 800] },
    { name: "Electricity Bill (KSEB)", unit: [800, 2500] },
  ],
};

const phone = () =>
  `+91 ${pick(["94", "95", "96", "98", "70", "81"])}${int(10, 99)} ${int(100, 999)} ${int(100, 999)}`;

export const placeholderImage = (label: string, hue: number) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue},28%,72%)'/><stop offset='1' stop-color='hsl(${hue + 30},22%,48%)'/></linearGradient></defs><rect width='640' height='480' fill='url(#g)'/><rect y='300' width='640' height='180' fill='hsl(${hue},15%,38%)' opacity='.5'/><rect x='170' y='150' width='300' height='190' fill='hsl(30,25%,85%)' opacity='.8'/><rect x='200' y='190' width='60' height='60' fill='hsl(${hue},20%,40%)' opacity='.6'/><rect x='380' y='190' width='60' height='60' fill='hsl(${hue},20%,40%)' opacity='.6'/><polygon points='150,155 320,70 490,155' fill='hsl(15,45%,45%)' opacity='.85'/><text x='24' y='452' font-family='sans-serif' font-size='22' fill='white'>${label.replace(/[<&>']/g, "")}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const billPlaceholder = (label: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='480'><rect width='360' height='480' fill='#fbfaf6'/><rect x='24' y='24' width='312' height='432' fill='none' stroke='#cfd6cf'/><text x='40' y='70' font-family='monospace' font-size='18' fill='#2f4f3a'>BILL / INVOICE</text>${Array.from({ length: 9 }, (_, i) => `<rect x='40' y='${110 + i * 34}' width='${180 + ((i * 37) % 100)}' height='10' fill='#dfe5df'/>`).join("")}<text x='40' y='430' font-family='monospace' font-size='14' fill='#555'>${label.replace(/[<&>']/g, "")}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export const permissionsFor = (role: User["role"]): Permissions => {
  const all = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Permissions;
  if (role === "owner") return all;
  if (role === "site_manager") return { ...all, manageStaffSites: false };
  return {
    viewSite: true,
    viewFinancials: false,
    createEntries: true,
    editEntries: false,
    manageItems: false,
    uploadMedia: true,
    reports: false,
    manageStaffSites: false,
  };
};

export function generateDemoDB(): DemoDB {
  seed = 20261027;
  const now = new Date().toISOString();
  const district = pick(DISTRICTS);
  const ownerName = `${pick(FIRST)} ${pick(LAST)}`;

  const owner: User = {
    id: "u_owner",
    name: ownerName,
    phone: phone(),
    email: "owner@cubesites.demo",
    role: "owner",
    active: true,
    permissions: permissionsFor("owner"),
    siteIds: [],
    createdAt: daysAgo(200).toISOString(),
  };

  const sites: Site[] = Array.from({ length: 6 }, (_, i) => {
    const status: Site["status"] = i < 4 ? "active" : i === 4 ? "completed" : "inactive";
    const start = daysAgo(int(60, 180));
    return {
      id: `s_${i + 1}`,
      name: `${pick(PLACES)} ${pick(PROJECT)}`,
      primaryPhone: phone(),
      altPhone: rnd() > 0.5 ? phone() : undefined,
      address: `${pick(PLACES)}, ${district}, Kerala`,
      status,
      startDate: iso(start),
      statusHistory: [
        { status: "active", at: start.toISOString(), by: owner.id },
        ...(status !== "active"
          ? [{ status, at: daysAgo(int(5, 30)).toISOString(), by: owner.id }]
          : []),
      ],
      createdAt: start.toISOString(),
    };
  });

  const manager: User = {
    id: "u_manager",
    name: `${pick(FIRST)} ${pick(LAST)}`,
    phone: phone(),
    email: "manager@cubesites.demo",
    role: "site_manager",
    active: true,
    permissions: permissionsFor("site_manager"),
    siteIds: [sites[0].id, sites[1].id, sites[2].id],
    createdAt: daysAgo(150).toISOString(),
  };
  const staff: User = {
    id: "u_staff",
    name: `${pick(FIRST)} ${pick(LAST)}`,
    phone: phone(),
    email: "staff@cubesites.demo",
    role: "staff",
    active: true,
    permissions: permissionsFor("staff"),
    siteIds: [sites[0].id],
    createdAt: daysAgo(90).toISOString(),
  };
  const staff2: User = {
    id: "u_staff2",
    name: `${pick(FIRST)} ${pick(LAST)}`,
    phone: phone(),
    email: "staff2@cubesites.demo",
    role: "staff",
    active: false,
    permissions: permissionsFor("staff"),
    siteIds: [sites[3].id],
    createdAt: daysAgo(60).toISOString(),
  };
  const users = [owner, manager, staff, staff2];

  const items: Item[] = [];
  (Object.keys(ITEM_POOL) as ExpenseType[]).forEach((t) =>
    ITEM_POOL[t].forEach((p) =>
      items.push({
        id: uid("i"),
        type: t,
        name: p.name,
        normalized: normalize(p.name),
        createdAt: daysAgo(180).toISOString(),
      }),
    ),
  );

  const entries: Entry[] = [];
  const attachments: Attachment[] = [];
  sites.forEach((site, si) => {
    const n = site.status === "active" ? int(18, 30) : int(10, 16);
    const startAgo = Math.floor((Date.now() - new Date(site.startDate).getTime()) / 86400000);
    for (let k = 0; k < n; k++) {
      const t = pick([
        "materials",
        "materials",
        "materials",
        "labour",
        "labour",
        "equipment",
        "other",
      ] as ExpenseType[]);
      const pool = ITEM_POOL[t];
      const p = pick(pool);
      const item = items.find((x) => x.type === t && x.name === p.name)!;
      const qty = t === "other" ? undefined : int(1, t === "materials" ? 120 : 8);
      const unit = int(p.unit[0], p.unit[1]) * 100;
      const total = qty ? qty * unit : unit;
      const d = iso(daysAgo(int(site.status === "active" ? 0 : 10, Math.max(12, startAgo))));
      const by = pick(users.filter((u) => u.role === "owner" || u.siteIds.includes(site.id)));
      const e: Entry = {
        id: uid("e"),
        siteId: site.id,
        type: t,
        itemId: item.id,
        description: item.name,
        quantity: qty,
        unitPricePaise: qty ? unit : undefined,
        totalPaise: total,
        date: d,
        attachmentIds: [],
        createdBy: by.id,
        createdAt: new Date(d + "T10:00:00").toISOString(),
        updatedAt: new Date(d + "T10:00:00").toISOString(),
      };
      if (rnd() > 0.65) {
        const a: Attachment = {
          id: uid("a"),
          siteId: site.id,
          entryId: e.id,
          kind: "bill",
          name: `bill-${k + 1}.jpg`,
          sizeBytes: int(300, 2400) * 1024,
          src: billPlaceholder(item.name),
          date: d,
          createdBy: by.id,
          createdAt: e.createdAt,
        };
        attachments.push(a);
        e.attachmentIds.push(a.id);
      }
      entries.push(e);
    }
    const payments = int(2, 5);
    for (let k = 0; k < payments; k++) {
      const d = iso(daysAgo(int(1, Math.max(10, startAgo))));
      entries.push({
        id: uid("e"),
        siteId: site.id,
        type: "payment",
        description: pick([
          "Advance payment",
          "Stage payment – foundation",
          "Stage payment – roof slab",
          "Part payment via NEFT",
          "Cheque received",
        ]),
        totalPaise: int(5, 30) * 5000000,
        date: d,
        attachmentIds: [],
        createdBy: owner.id,
        createdAt: new Date(d + "T12:00:00").toISOString(),
        updatedAt: new Date(d + "T12:00:00").toISOString(),
      });
    }
    const photos = int(3, 7);
    const captions = [
      "Foundation work",
      "Plinth beam",
      "Column casting",
      "Lintel level",
      "Roof slab concreting",
      "Plastering",
      "Tile work",
      "Painting",
    ];
    for (let k = 0; k < photos; k++) {
      const d = iso(daysAgo(int(1, Math.max(10, startAgo))));
      attachments.push({
        id: uid("a"),
        siteId: site.id,
        kind: "photo",
        name: `progress-${k + 1}.jpg`,
        sizeBytes: int(1200, 4200) * 1024,
        src: placeholderImage(captions[k % captions.length], 90 + si * 25 + k * 7),
        caption: captions[k % captions.length],
        date: d,
        createdBy: pick([owner.id, manager.id]),
        createdAt: new Date(d + "T15:00:00").toISOString(),
      });
    }
  });

  const storage: StorageSnapshot[] = Array.from({ length: 60 }, (_, i) => ({
    date: iso(daysAgo(59 - i)),
    bytes: Math.round((240 + i * 3.4 + rnd() * 20) * 1024 * 1024),
  }));

  const activity: ActivityLog[] = entries.slice(-25).map((e) => ({
    id: uid("l"),
    actorId: e.createdBy,
    at: e.createdAt,
    action: "create",
    targetType: "entry",
    targetId: e.id,
    siteId: e.siteId,
    summary: `Added ${e.type === "payment" ? "payment" : e.type} entry “${e.description}”`,
    after: { total: e.totalPaise / 100 },
  }));
  activity.sort((a, b) => b.at.localeCompare(a.at));

  const lastMonth = daysAgo(30);
  const ls = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const le = new Date(ls);
  le.setDate(ls.getDate() + 29);
  const invLines = [
    { label: "Active sites", detail: "5 active · 3 free · 2 × ₹109", amountPaise: 21800 },
    { label: "Staff accounts", detail: "2 enabled · 1 free · 1 × ₹29", amountPaise: 2900 },
    { label: "Storage", detail: "262.4 MB avg · 250 MB free · 1 × ₹5", amountPaise: 500 },
  ];
  const sub = invLines.reduce((a, b) => a + b.amountPaise, 0);
  const tax = Math.round(sub * 0.18);

  return {
    version: 1,
    account: {
      id: "acc_1",
      businessName: `${ownerName.split(" ")[0]} Builders & Contractors`,
      ownerName,
      phone: owner.phone,
      email: owner.email,
      district,
    },
    users,
    sites,
    items,
    entries,
    attachments,
    activity,
    storage,
    invoices: [
      {
        id: "inv_1",
        number: `CS-${ls.getFullYear()}-${String(ls.getMonth() + 1).padStart(2, "0")}-001`,
        periodStart: iso(ls),
        periodEnd: iso(le),
        lines: invLines,
        subtotalPaise: sub,
        taxPaise: tax,
        totalPaise: sub + tax,
        status: "paid",
        issuedAt: le.toISOString(),
      },
    ],
    billingPayments: [
      {
        id: "bp_1",
        invoiceId: "inv_1",
        amountPaise: sub + tax,
        method: "upi",
        reference: "UPI/DEMO/0001",
        status: "approved",
        at: le.toISOString(),
      },
    ],
    wallet: {
      balancePaise: 125000,
      paidRechargedPaise: 200000,
      freeRechargedPaise: 25000,
      transactions: [
        {
          id: "wt_1",
          amountPaise: 200000,
          kind: "recharge",
          funding: "paid",
          source: "admin",
          note: "Bank transfer",
          reference: "NEFT/DEMO/1",
          balanceAfterPaise: 200000,
          countsAsIncome: true,
          at: daysAgo(20).toISOString(),
        },
        {
          id: "wt_2",
          amountPaise: 25000,
          kind: "recharge",
          funding: "free",
          source: "admin",
          note: "Promo credit",
          reference: "",
          balanceAfterPaise: 225000,
          countsAsIncome: false,
          at: daysAgo(18).toISOString(),
        },
        {
          id: "wt_3",
          amountPaise: -100000,
          kind: "debit",
          funding: "paid",
          source: "system",
          note: "Subscription settlement",
          reference: "",
          balanceAfterPaise: 125000,
          countsAsIncome: false,
          at: daysAgo(5).toISOString(),
        },
      ],
    },
    notes: [
      {
        id: "note_1",
        siteId: sites[0]?.id,
        title: "Cement rate today",
        body: "Ask supplier for bulk rate before Friday pour.",
        pinned: true,
        createdBy: owner.id,
        createdAt: daysAgo(2).toISOString(),
        updatedAt: daysAgo(1).toISOString(),
      },
      {
        id: "note_2",
        title: "GST filing checklist",
        body: "Collect invoices from all sites by month end.",
        pinned: false,
        createdBy: owner.id,
        createdAt: daysAgo(5).toISOString(),
        updatedAt: daysAgo(5).toISOString(),
      },
    ],
    reminders: [
      {
        id: "rem_1",
        siteId: sites[0]?.id,
        title: "Steel delivery follow-up",
        body: "Call vendor if truck not arrived.",
        dueAt: new Date(Date.now() + 3600_000).toISOString(),
        done: false,
        createdBy: owner.id,
        createdAt: daysAgo(1).toISOString(),
        updatedAt: daysAgo(1).toISOString(),
      },
      {
        id: "rem_2",
        title: "Pay electricity bill",
        body: "Office meter.",
        dueAt: new Date(Date.now() + 86400_000 * 2).toISOString(),
        done: false,
        createdBy: owner.id,
        createdAt: daysAgo(3).toISOString(),
        updatedAt: daysAgo(3).toISOString(),
      },
    ],
    notifications: [
      {
        id: uid("n"),
        title: "Welcome to CuboSites",
        body: "This is a demo workspace with generated Kerala construction data.",
        at: now,
        read: false,
      },
      {
        id: uid("n"),
        title: "Storage nearing free limit",
        body: "Your average storage is above 250 MB this month.",
        at: daysAgo(2).toISOString(),
        read: false,
      },
    ],
    settings: {
      taxLabel: "GST",
      taxRatePct: 18,
      showTaxBreakup: true,
      driveStatus: "not_connected",
      backups: [],
      notify: { dailySummary: true, paymentReceived: true, backupFailure: true, invoiceDue: true },
    },
    prefs: {},
  };
}
