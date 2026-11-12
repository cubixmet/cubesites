import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/AppShell";
import { authService, type AuthConfig } from "@/services/auth";
import { ApiError, apiEnabled } from "@/lib/api";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — CuboSites" },
      { name: "description", content: "Sign in or create your CuboSites contractor workspace." },
      { property: "og:site_name", content: "CuboSites" },
      { property: "og:title", content: "Sign in — CuboSites" },
      {
        property: "og:description",
        content:
          "Sign in with Google, or email and password. Phone can be used to sign in after signup.",
      },
      { name: "twitter:title", content: "Sign in — CuboSites" },
    ],
  }),
  component: Login,
});

type Mode = "signin" | "signup" | "otp" | "google-complete" | "forgot" | "reset";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, cfg: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [otp, setOtp] = useState("");
  const [pw2, setPw2] = useState("");
  const [googleCredential, setGoogleCredential] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authService.currentUser()) nav({ to: "/dashboard", replace: true });
  }, [nav]);

  useEffect(() => {
    authService
      .getConfig()
      .then(setConfig)
      .catch(() => setConfig({ googleClientId: "", googleEnabled: false, otpExpiryMinutes: 10 }));
  }, []);

  useEffect(() => {
    if (!config?.googleEnabled || !config.googleClientId || !googleBtnRef.current) return;
    if (mode === "otp" || mode === "google-complete" || mode === "forgot" || mode === "reset")
      return;

    const handleCredential = async (response: { credential: string }) => {
      setLoading(true);
      setErr({});
      try {
        const u = await authService.loginWithGoogle(response.credential);
        toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
        nav({ to: "/dashboard" });
      } catch (e) {
        const apiErr = e as ApiError;
        if (apiErr.status === 409 && apiErr.code === "signup_required") {
          setGoogleCredential(response.credential);
          setEmail(String(apiErr.data?.email || ""));
          setName(String(apiErr.data?.name || ""));
          setMode("google-complete");
          toast.message("Almost done — add your business details.");
        } else {
          setErr({ form: apiErr.message || "Google sign-in failed." });
        }
      } finally {
        setLoading(false);
      }
    };

    const mount = () => {
      if (!window.google || !googleBtnRef.current) return;
      const clientId = config.googleClientId.trim();
      // GIS needs this exact browser origin listed under Authorized JavaScript origins.
      const origin = window.location.origin;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
        ux_mode: "popup",
        // Helps Google associate the popup with this SPA origin
        cancel_on_tap_outside: true,
      });
      googleBtnRef.current.innerHTML = "";
      try {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: Math.max(googleBtnRef.current.offsetWidth || 320, 280),
          text: mode === "signup" ? "signup_with" : "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      } catch (e) {
        setErr({
          form: `Google Sign-In failed to load for ${origin}. In Google Cloud Console → Credentials → this Web client, add Authorized JavaScript origin: ${origin}`,
        });
        console.error("GIS renderButton failed", e, { clientId, origin });
      }
    };

    const existing = document.querySelector(
      'script[data-google-gis="1"]',
    ) as HTMLScriptElement | null;
    if (window.google) {
      mount();
      return;
    }
    if (existing) {
      existing.addEventListener("load", mount);
      return () => existing.removeEventListener("load", mount);
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = "1";
    script.onload = mount;
    document.head.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [config, mode, nav]);

  const goDashboard = (firstName: string) => {
    toast.success(`Welcome${firstName ? `, ${firstName}` : ""}`);
    nav({ to: "/dashboard" });
  };

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!id.trim()) v.id = "Enter your email or phone number.";
    if (pw.length < 6) v.pw = "Password must be at least 6 characters.";
    setErr(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      const u = await authService.login(id, pw);
      goDashboard(u.name.split(" ")[0]);
    } catch (ex) {
      setErr({ form: (ex as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const submitSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) v.email = "Enter a valid email address.";
    if (pw.length < 8) v.pw = "Password must be at least 8 characters.";
    if (name.trim().length < 2) v.name = "Enter your full name.";
    if (businessName.trim().length < 2) v.businessName = "Enter your business name.";
    if (phone && phone.replace(/\D/g, "").length < 10) v.phone = "Enter a valid 10-digit phone.";
    setErr(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      await authService.startSignup({
        email: email.trim(),
        password: pw,
        name: name.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
      });
      setMode("otp");
      toast.success("Check your email for the verification code.");
    } catch (ex) {
      setErr({ form: (ex as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setErr({ otp: "Enter the 6-digit code from your email." });
      return;
    }
    setLoading(true);
    setErr({});
    try {
      const u = await authService.verifySignup(email.trim(), otp.trim());
      goDashboard(u.name.split(" ")[0]);
    } catch (ex) {
      setErr({ form: (ex as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const submitGoogleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName.trim().length < 2) {
      setErr({ businessName: "Enter your business name." });
      return;
    }
    setLoading(true);
    setErr({});
    try {
      const u = await authService.completeGoogleSignup(
        googleCredential,
        businessName.trim(),
        phone.trim(),
        name.trim(),
        email.trim(),
      );
      goDashboard(u.name.split(" ")[0]);
    } catch (ex) {
      setErr({ form: (ex as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      await authService.resendSignupOtp(email.trim());
      toast.success("A new code was sent.");
    } catch (ex) {
      toast.error((ex as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErr({ email: "Enter the email on your account." });
      return;
    }
    setLoading(true);
    setErr({});
    try {
      await authService.forgotPassword(email.trim());
      setOtp("");
      setPw("");
      setPw2("");
      setMode("reset");
      toast.success("If that email is registered, a reset code is on its way.");
    } catch (ex) {
      setErr({ form: (ex as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!/^\d{6}$/.test(otp.trim())) v.otp = "Enter the 6-digit code from your email.";
    if (pw.length < 8) v.pw = "Password must be at least 8 characters.";
    if (pw !== pw2) v.pw2 = "Passwords do not match.";
    setErr(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      await authService.resetPassword(email.trim(), otp.trim(), pw);
      toast.success("Password updated. Sign in with your new password.");
      setPw("");
      setPw2("");
      setOtp("");
      setId(email.trim());
      setMode("signin");
      setErr({});
    } catch (ex) {
      setErr({ form: (ex as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const resendResetOtp = async () => {
    setLoading(true);
    try {
      await authService.resendPasswordResetOtp(email.trim());
      toast.success("A new reset code was sent.");
    } catch (ex) {
      toast.error((ex as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-surface md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <Logo onDark className="h-10 max-w-[14rem] sm:h-11" />
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Every site's money, bills and progress — in your pocket.
          </h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Record cement bags, labour wages and client payments in seconds, right from the site.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">
          Built in control · for contractors managing multiple sites.
        </p>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 h-10 max-w-[14rem] md:hidden" />

          {mode === "signin" && (
            <>
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Google, or email / phone with your password.
              </p>

              {config?.googleEnabled && (
                <div className="mt-6 space-y-3">
                  <div
                    ref={googleBtnRef}
                    className="flex min-h-11 w-full justify-center [&>div]:w-full"
                  />
                  <div className="relative py-1 text-center text-xs text-muted-foreground">
                    <span className="bg-surface relative z-10 px-2">
                      or continue with email / phone
                    </span>
                    <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                  </div>
                </div>
              )}

              <form onSubmit={submitSignIn} className="mt-4 space-y-4" noValidate>
                <div>
                  <Label htmlFor="id">Email or phone</Label>
                  <Input
                    id="id"
                    autoComplete="username"
                    className="mt-1.5 h-12 text-base"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    aria-invalid={!!err.id}
                  />
                  {err.id && <p className="mt-1 text-xs text-destructive">{err.id}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="pw">Password</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        setEmail(id.includes("@") ? id.trim() : "");
                        setMode("forgot");
                        setErr({});
                        setOtp("");
                        setPw("");
                        setPw2("");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="pw"
                    type="password"
                    autoComplete="current-password"
                    className="mt-1.5 h-12 text-base"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    aria-invalid={!!err.pw}
                  />
                  {err.pw && <p className="mt-1 text-xs text-destructive">{err.pw}</p>}
                </div>
                {err.form && (
                  <p
                    role="alert"
                    className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
                  >
                    {err.form}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}Sign in
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                New contractor?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setErr({});
                  }}
                >
                  Create an account
                </button>
              </p>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                By continuing you agree to our{" "}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  hash="terms"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Terms
                </Link>
                .
              </p>
            </>
          )}

          {mode === "signup" && (
            <>
              <h2 className="text-2xl font-semibold">Create account</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll email a one-time code to verify you. Phone is optional for later login.
              </p>

              {config?.googleEnabled && (
                <div className="mt-6 space-y-3">
                  <div
                    ref={googleBtnRef}
                    className="flex min-h-11 w-full justify-center [&>div]:w-full"
                  />
                  <div className="relative py-1 text-center text-xs text-muted-foreground">
                    <span className="bg-surface relative z-10 px-2">or sign up with email</span>
                    <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                  </div>
                </div>
              )}

              <form onSubmit={submitSignUp} className="mt-4 space-y-3.5" noValidate>
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    className="mt-1.5 h-11"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={!!err.name}
                  />
                  {err.name && <p className="mt-1 text-xs text-destructive">{err.name}</p>}
                </div>
                <div>
                  <Label htmlFor="business">Business / company</Label>
                  <Input
                    id="business"
                    className="mt-1.5 h-11"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    aria-invalid={!!err.businessName}
                  />
                  {err.businessName && (
                    <p className="mt-1 text-xs text-destructive">{err.businessName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="mt-1.5 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!err.email}
                  />
                  {err.email && <p className="mt-1 text-xs text-destructive">{err.email}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">
                    Phone{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional — for login later)
                    </span>
                  </Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    className="mt-1.5 h-11"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={!!err.phone}
                  />
                  {err.phone && <p className="mt-1 text-xs text-destructive">{err.phone}</p>}
                </div>
                <div>
                  <Label htmlFor="signup-pw">Password</Label>
                  <Input
                    id="signup-pw"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1.5 h-11"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    aria-invalid={!!err.pw}
                  />
                  {err.pw && <p className="mt-1 text-xs text-destructive">{err.pw}</p>}
                </div>
                {err.form && (
                  <p
                    role="alert"
                    className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
                  >
                    {err.form}
                  </p>
                )}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  By creating an account you agree to our{" "}
                  <Link
                    to="/privacy"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    hash="terms"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Terms
                  </Link>
                  .
                </p>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading || !apiEnabled}
                >
                  {loading && <Loader2 className="animate-spin" />}Send verification code
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode("signin");
                    setErr({});
                  }}
                >
                  Sign in
                </button>
              </p>
            </>
          )}

          {mode === "otp" && (
            <>
              <h2 className="text-2xl font-semibold">Verify email</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-foreground">{email}</span>. OTP is only for signup
                — later you can sign in with email or phone + password.
              </p>
              <form onSubmit={submitOtp} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="mt-1.5 h-12 text-center text-lg tracking-[0.3em]"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-invalid={!!err.otp}
                  />
                  {err.otp && <p className="mt-1 text-xs text-destructive">{err.otp}</p>}
                </div>
                {err.form && (
                  <p
                    role="alert"
                    className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
                  >
                    {err.form}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}Verify & create account
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={loading}
                  onClick={resendOtp}
                >
                  Resend code
                </Button>
              </form>
              <p className="mt-4 text-center text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMode("signup");
                    setOtp("");
                    setErr({});
                  }}
                >
                  ← Back
                </button>
              </p>
            </>
          )}

          {mode === "google-complete" && (
            <>
              <h2 className="text-2xl font-semibold">Finish Google signup</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed in as {email || "your Google account"}. Add your business to create the
                workspace.
              </p>
              <form onSubmit={submitGoogleComplete} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="g-name">Your name</Label>
                  <Input
                    id="g-name"
                    className="mt-1.5 h-11"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="g-biz">Business / company</Label>
                  <Input
                    id="g-biz"
                    className="mt-1.5 h-11"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    aria-invalid={!!err.businessName}
                  />
                  {err.businessName && (
                    <p className="mt-1 text-xs text-destructive">{err.businessName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="g-phone">
                    Phone <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="g-phone"
                    inputMode="tel"
                    className="mt-1.5 h-11"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                {err.form && (
                  <p
                    role="alert"
                    className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
                  >
                    {err.form}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}Create workspace
                </Button>
              </form>
              <p className="mt-4 text-center text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMode("signin");
                    setGoogleCredential("");
                    setErr({});
                  }}
                >
                  ← Back to sign in
                </button>
              </p>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2 className="text-2xl font-semibold">Forgot password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the email on your account. We'll send a 6-digit reset code.
              </p>
              <form onSubmit={submitForgot} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    className="mt-1.5 h-12 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!err.email}
                  />
                  {err.email && <p className="mt-1 text-xs text-destructive">{err.email}</p>}
                </div>
                {err.form && (
                  <p
                    role="alert"
                    className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
                  >
                    {err.form}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading || !apiEnabled}
                >
                  {loading && <Loader2 className="animate-spin" />}Send reset code
                </Button>
              </form>
              <p className="mt-6 text-center text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMode("signin");
                    setErr({});
                  }}
                >
                  ← Back to sign in
                </button>
              </p>
            </>
          )}

          {mode === "reset" && (
            <>
              <h2 className="text-2xl font-semibold">Reset password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the code sent to <span className="font-medium text-foreground">{email}</span>,
                then choose a new password.
              </p>
              <form onSubmit={submitReset} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="reset-otp">Reset code</Label>
                  <Input
                    id="reset-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="mt-1.5 h-12 text-center text-lg tracking-[0.3em]"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-invalid={!!err.otp}
                  />
                  {err.otp && <p className="mt-1 text-xs text-destructive">{err.otp}</p>}
                </div>
                <div>
                  <Label htmlFor="reset-pw">New password</Label>
                  <Input
                    id="reset-pw"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1.5 h-12 text-base"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    aria-invalid={!!err.pw}
                  />
                  {err.pw && <p className="mt-1 text-xs text-destructive">{err.pw}</p>}
                </div>
                <div>
                  <Label htmlFor="reset-pw2">Confirm password</Label>
                  <Input
                    id="reset-pw2"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1.5 h-12 text-base"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    aria-invalid={!!err.pw2}
                  />
                  {err.pw2 && <p className="mt-1 text-xs text-destructive">{err.pw2}</p>}
                </div>
                {err.form && (
                  <p
                    role="alert"
                    className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
                  >
                    {err.form}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}Update password
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={loading}
                  onClick={resendResetOtp}
                >
                  Resend code
                </Button>
              </form>
              <p className="mt-4 text-center text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMode("forgot");
                    setOtp("");
                    setPw("");
                    setPw2("");
                    setErr({});
                  }}
                >
                  ← Back
                </button>
              </p>
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <span className="mx-2 text-border">·</span>
            <Link to="/privacy" hash="terms" className="hover:text-foreground hover:underline">
              Terms of Use
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
