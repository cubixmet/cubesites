import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/app/AppShell";
import { authService } from "@/services/auth";
import { BRAND, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  ssr: false,
  head: pageHead(
    "Privacy Policy & Terms",
    `How ${BRAND} collects, uses and protects contractor workspace data, and the terms for using the service.`,
  ),
  component: PrivacyPolicyPage,
});

const UPDATED = "5 November 2026";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 space-y-3 border-b border-border/70 pb-8 last:border-0"
    >
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function PrivacyPolicyPage() {
  const signedIn = Boolean(authService.currentUser());

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link
            to={signedIn ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>
          <Link to={signedIn ? "/dashboard" : "/login"} className="ml-auto">
            <Logo className="h-7 max-w-[10rem]" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Legal</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Privacy Policy & Terms</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {UPDATED}. This page applies to the {BRAND} contractor app (web and PWA).
        </p>

        <nav className="mt-6 flex flex-wrap gap-2 text-sm">
          <a
            href="#privacy"
            className="rounded-full border bg-card px-3 py-1.5 font-medium hover:border-primary/40"
          >
            Privacy Policy
          </a>
          <a
            href="#terms"
            className="rounded-full border bg-card px-3 py-1.5 font-medium hover:border-primary/40"
          >
            Terms of Use
          </a>
          <a
            href="#contact"
            className="rounded-full border bg-card px-3 py-1.5 font-medium hover:border-primary/40"
          >
            Contact
          </a>
        </nav>

        <div className="mt-10 space-y-10">
          <Section id="privacy" title="1. Privacy Policy">
            <p>
              {BRAND} (“we”, “us”) provides bookkeeping tools for construction contractors. We
              process information so you can run your workspace, sign in, and receive product
              messages such as verification codes and reminder alerts.
            </p>
          </Section>

          <Section id="data-we-collect" title="2. Information we collect">
            <ul>
              <li>
                <strong>Account details</strong> — name, email, phone (optional), business name, and
                password hashes (we never store plain passwords).
              </li>
              <li>
                <strong>Google Sign-In</strong> — if you use Google, we receive your Google account
                email, name, and a stable Google user id after you approve Sign in with Google.
              </li>
              <li>
                <strong>Workspace data you enter</strong> — sites, staff, ledger entries, invoices,
                notes, reminders, media you upload, and related activity logs.
              </li>
              <li>
                <strong>Billing & wallet</strong> — subscription usage, invoices, payment references
                you submit, and wallet recharge history (including whether a credit was free or
                paid).
              </li>
              <li>
                <strong>Device & app signals</strong> — basic technical logs (for example IP,
                browser type, and error reports) needed to operate and secure the service. If you
                install the PWA and allow notifications, your browser may hold a push subscription
                for reminder alarms.
              </li>
            </ul>
          </Section>

          <Section id="how-we-use" title="3. How we use information">
            <ul>
              <li>Provide and improve the contractor workspace and admin tools.</li>
              <li>Authenticate you (email/password, OTP, or Google) and reset passwords.</li>
              <li>
                Send transactional email (OTP, password reset) and in-app / device reminder
                notifications you configure.
              </li>
              <li>
                Calculate usage-based billing, process manual payment reviews, and maintain wallet
                balances.
              </li>
              <li>Prevent abuse, debug outages, and meet legal obligations.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell your personal information. We do not use your site
              ledger data to advertise third-party products to you.
            </p>
          </Section>

          <Section id="sharing" title="4. Sharing">
            <p>We share data only when needed to run {BRAND}:</p>
            <ul>
              <li>
                <strong>Service providers</strong> — e.g. email delivery (SMTP), hosting, and (when
                enabled) payment gateways such as Razorpay for wallet top-ups.
              </li>
              <li>
                <strong>Google</strong> — solely for Sign-In token verification when you choose
                Google authentication.
              </li>
              <li>
                <strong>Legal requests</strong> — if required by applicable law or to protect rights
                and safety.
              </li>
            </ul>
            <p>
              Workspace owners control staff access inside their tenant. Platform admins may access
              contractor account metadata for support and billing — not to re-sell your project
              data.
            </p>
          </Section>

          <Section id="retention" title="5. Retention & security">
            <p>
              We keep account and workspace data while your account is active and for a limited
              period afterward as needed for billing disputes, backups, or legal retention. You may
              request deletion of your account subject to outstanding invoices and statutory
              records.
            </p>
            <p>
              We use industry-standard safeguards (HTTPS, hashed passwords, tenant isolation on the
              API). No method of transmission or storage is 100% secure; please use a strong
              password and keep staff access limited.
            </p>
          </Section>

          <Section id="your-choices" title="6. Your choices">
            <ul>
              <li>Update profile and workspace details in Settings.</li>
              <li>
                Turn notification preferences on or off where the app provides toggles; revoke
                browser notification permission at any time.
              </li>
              <li>
                Disconnect Google Sign-In by using email/password (or contacting support) if both
                methods are linked.
              </li>
              <li>Request access, correction, or deletion by contacting us (see below).</li>
            </ul>
          </Section>

          <Section id="terms" title="7. Terms of Use">
            <p>By creating an account or using {BRAND}, you agree to these terms.</p>
            <ul>
              <li>
                <strong>Eligibility</strong> — you must be able to form a binding contract and use
                the service for legitimate business bookkeeping.
              </li>
              <li>
                <strong>Your content</strong> — you own the data you enter. You grant us a limited
                licence to host and process it solely to provide the service.
              </li>
              <li>
                <strong>Acceptable use</strong> — do not misuse the service, attempt unauthorised
                access, upload unlawful content, or interfere with other tenants.
              </li>
              <li>
                <strong>Subscriptions & wallet</strong> — fees follow the published pricing and tax
                rules. Paid wallet recharges count toward platform income; free credits do not.
                Online payments may be handled by third-party gateways under their terms.
              </li>
              <li>
                <strong>Availability</strong> — we aim for reliable uptime but do not guarantee
                uninterrupted service. Keep your own exports/backups for critical records.
              </li>
              <li>
                <strong>Liability</strong> — {BRAND} is a bookkeeping aid, not accounting, tax, or
                legal advice. To the fullest extent permitted by law, our liability is limited to
                fees you paid us in the three months before a claim.
              </li>
              <li>
                <strong>Changes</strong> — we may update this page; material changes will be
                reflected by the “Last updated” date. Continued use after changes means you accept
                the revised terms.
              </li>
            </ul>
          </Section>

          <Section id="contact" title="8. Contact">
            <p>
              Questions about privacy or these terms:{" "}
              <a
                className="font-medium text-primary hover:underline"
                href="mailto:privacy@cubosites.com"
              >
                privacy@cubosites.com
              </a>{" "}
              (or your organisation’s support address if configured).
            </p>
            <p className="pt-2">
              <Link
                to={signedIn ? "/dashboard" : "/login"}
                className="font-medium text-primary hover:underline"
              >
                {signedIn ? "← Back to dashboard" : "← Back to sign in"}
              </Link>
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
