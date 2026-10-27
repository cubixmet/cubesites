<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- UI reads data only through `src/services/*Queries` and mutates via `*Service`; never touch `src/mock` from components — keeps the backend swap to service bodies only.
- Money is stored as integer paise and calculated with `src/lib/money.ts` — avoids float drift.
- Billing rules live only in `src/lib/billing.ts` with tests in `billing.test.ts` — single source for pricing.
- Authenticated pages are children of `src/routes/_authenticated.tsx` (client-only, `ssr: false`) because demo data/session live in localStorage.
