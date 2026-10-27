import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/AppShell";
import { authService, DEMO_PASSWORD } from "@/services/auth";
import { ROLE_LABEL } from "@/lib/format";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Cubixmet's CubeSites" },
      { name: "description", content: "Sign in to your Cubixmet's CubeSites contractor workspace." },
      { property: "og:site_name", content: "Cubixmet's CubeSites" },
      { property: "og:title", content: "Sign in — Cubixmet's CubeSites" },
      {
        property: "og:description",
        content: "Sign in to manage your construction sites, expenses and payments.",
      },
      { name: "twitter:title", content: "Sign in — Cubixmet's CubeSites" },
      {
        name: "twitter:description",
        content: "Sign in to manage your construction sites, expenses and payments.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<{ id?: string; pw?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (authService.currentUser()) nav({ to: "/dashboard", replace: true }); }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: typeof err = {};
    if (!id.trim()) v.id = "Enter your email or phone number.";
    if (pw.length < 6) v.pw = "Password must be at least 6 characters.";
    setErr(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      const u = await authService.login(id, pw);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
      nav({ to: "/dashboard" });
    } catch (e) { setErr({ form: (e as Error).message }); } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-screen bg-surface md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <Logo className="[&>span]:bg-primary-foreground [&>span]:text-primary" />
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Every site's money, bills and progress — in your pocket.</h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">Record cement bags, labour wages and client payments in seconds, right from the site.</p>
        </div>
        <p className="text-sm text-primary-foreground/70">Built for contractors across Kerala.</p>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 md:hidden" />
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use your email or registered phone number.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="id">Email or phone</Label>
              <Input id="id" autoComplete="username" className="mt-1.5 h-12 text-base" value={id} onChange={(e) => setId(e.target.value)} aria-invalid={!!err.id} />
              {err.id && <p className="mt-1 text-xs text-destructive">{err.id}</p>}
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" autoComplete="current-password" className="mt-1.5 h-12 text-base" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!err.pw} />
              {err.pw && <p className="mt-1 text-xs text-destructive">{err.pw}</p>}
            </div>
            {err.form && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{err.form}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Sign in</Button>
          </form>

          <div className="mt-8 rounded-xl border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-warning" /> Demo accounts</p>
            <p className="mt-1 text-xs text-muted-foreground">Password for all: <code className="rounded bg-muted px-1">{DEMO_PASSWORD}</code>. Frontend-only demo login — not secure.</p>
            <div className="mt-3 grid gap-2">
              {authService.demoAccounts().map((a) => (
                <Button key={a.email} type="button" variant="outline" className="h-auto justify-between py-2" onClick={() => { setId(a.email); setPw(DEMO_PASSWORD); setErr({}); }}>
                  <span className="text-left"><span className="block text-sm">{ROLE_LABEL[a.role]}</span><span className="block text-xs font-normal text-muted-foreground">{a.email}</span></span>
                  <span className="text-xs font-normal">Use</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
