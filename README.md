# CubeSites — Frontend (demo)

Mobile-first bookkeeping for contractors managing multiple construction sites. This phase is **frontend only** with a mock data/service layer.

## Demo login
Open the app → login screen lists demo accounts (Owner, Site Manager, Staff). Password for all: `demo1234`.
Demo auth is stored in localStorage and is **not secure** — real authentication/authorization must be implemented on the backend.

## Structure
- `src/routes/` — file-based routes (TanStack Router; the project's fixed router — used instead of React Router).
  - `login`, `_authenticated` (session gate + app shell), `dashboard`, `sites/`, `sites/$siteId`, `entry/new`, `entries`, `payments`, `photos`, `staff`, `reports`, `subscription`, `settings`, `activity`, `more`.
- `src/components/app/` — shell, entry form, item combobox, attachment picker, photo gallery, site dialogs, shared UI.
- `src/services/` — **all** reads (`*Queries`) and mutations (`*Service`): auth, sites, entries/items, media, staff, account (billing/settings/notifications/prefs), reports/export.
- `src/mock/` — `seed.ts` generates demo-only sample data (Kerala place names for realism); product UI is region-agnostic. `store.ts` is isolated localStorage persistence (reset from Settings → Demo data).
- `src/lib/billing.ts` — pricing rules (sites, staff, storage, reactivation proration, tax). Tested in `billing.test.ts`.
- `src/lib/money.ts` — integer-paise money math for qty/unit/total.
- `src/types/` — entity interfaces.

## Backend integration points
Replace service function bodies with HTTP calls; keep signatures. Swap `mock/store.ts` and `services/auth.ts` first. Move permission checks (`services/core.ts`) server-side.

## Limitations
- No real uploads: images are compressed and stored in the browser (limited space; large uploads may hit the storage limit).
- Images removed by abandoning an unsaved entry form may remain as orphaned demo files.
- Online payment, Google Drive backup/restore and notification delivery are labelled placeholders.
- Manual billing payments stay "pending approval" (approval belongs to the future Super Admin portal).
- Storage snapshots are generated, not measured. English only; Malayalam localisation not yet added.
