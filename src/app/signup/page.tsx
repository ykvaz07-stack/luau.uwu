"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, ArrowRight, Loader2, CheckCircle, ExternalLink } from "lucide-react";

const DISPOSABLE_KEYWORDS = ["tempmail", "temp-mail", "throwaway", "disposable", "trashmail", "fakeinbox", "dropmail", "getairmail", "maildrop", "guerrillamail", "spamgourmet", "mailinator", "yopmail", "jetable", "wegwerfemail"];
function looksDisposable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_KEYWORDS.some((k) => domain.includes(k));
}

export default function SignupPage() {
  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [checking, setChecking] = useState(true);
  const [hasEmailService, setHasEmailService] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [clientIp, setClientIp] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) { setChecking(false); return; }
        const { data } = await supabase.auth.getUser();
        if (data.user) { router.replace("/dashboard"); return; }
        const res = await fetch("/api/auth/check-service");
        const json = await res.json();
        setHasEmailService(json.emailService === true);
      } catch {} finally { setChecking(false); }
    })();
    // Detect client IP as fallback
    (async () => {
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        const d = await r.json();
        if (d.ip) setClientIp(d.ip);
      } catch {}
    })();
  }, [router]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) { setError("Passwords do not match"); setLoading(false); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
    if (email.includes("+")) { setError("Plus-addressed emails are not allowed"); setLoading(false); return; }
    if (looksDisposable(email)) { setError("Disposable email addresses are not allowed. Use a permanent email."); setLoading(false); return; }

    if (hasEmailService) {
      try {
        const res = await fetch("/api/auth/send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, clientIp }),
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error || "Failed to send code"); setLoading(false); return; }
        setSentTo(email);
        setStep("verify");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } catch { setError("Failed to send verification code"); }
      setLoading(false);
      return;
    }

    // No email service — use Supabase built-in confirmation
    try {
      const { createClient, getSiteUrl } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) { setError("Auth not configured"); setLoading(false); return; }
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${getSiteUrl()}/auth/callback${clientIp ? `?clientIp=${clientIp}` : ""}` },
      });
      if (authError) { setError(authError.message); setLoading(false); return; }
      setSentTo(email);
      setStep("done");
    } catch { setError("Failed to create account"); }
    setLoading(false);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      const newCode = [...code];
      for (let i = 0; i < 6; i++) newCode[i] = digits[i] || "";
      setCode(newCode);
      const nextEmpty = newCode.findIndex((c) => !c);
      if (nextEmpty >= 0) inputRefs.current[nextEmpty]?.focus();
      else inputRefs.current[5]?.focus();
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code: fullCode, clientIp }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Invalid code"); setLoading(false); return; }
      setStep("done");
      setTimeout(() => router.push("/login"), 2000);
    } catch { setError("Verification failed"); }
    setLoading(false);
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">Back to home</Link>

            {step === "form" && (
              <><h1 className="text-2xl font-bold">Create an account</h1><p className="text-sm text-muted-foreground mt-1">Start protecting your scripts today</p></>
            )}

            {step === "verify" && (
              <><h1 className="text-2xl font-bold">Check your email</h1><p className="text-sm text-muted-foreground mt-1">We sent a 6-digit code to <strong>{email}</strong></p></>
            )}

            {step === "done" && hasEmailService && (
              <><h1 className="text-2xl font-bold flex items-center gap-2"><CheckCircle className="h-6 w-6 text-green-500" /> Verified!</h1><p className="text-sm text-muted-foreground mt-1">Redirecting you to sign in...</p></>
            )}

            {step === "done" && !hasEmailService && (
              <><h1 className="text-2xl font-bold">Check your email</h1>
                <p className="text-sm text-muted-foreground mt-1">We sent a confirmation link to <strong>{sentTo}</strong></p>
                <p className="text-xs text-muted-foreground/60 mt-2">Click the link in the email to verify your account, then sign in.</p>
              </>
            )}
          </div>

          {step === "form" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input id="confirmPassword" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {hasEmailService ? "Send verification code" : "Create account"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          {step === "verify" && (
            <div className="space-y-6">
              {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
              <div className="flex gap-2 justify-center">
                {code.map((digit, i) => (
                  <input key={i} ref={(el) => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={6} value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)} onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="w-12 h-14 rounded-lg border border-input bg-background text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all" autoComplete="one-time-code" />
                ))}
              </div>
              <button onClick={handleVerifyCode} disabled={loading || code.join("").length !== 6}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify code"}
              </button>
              <button onClick={() => { setStep("form"); setCode(["", "", "", "", "", ""]); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">Use a different email</button>
            </div>
          )}

          {step === "done" && !hasEmailService && (
            <div className="text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-2">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <a href={`https://${sentTo.split("@")[1]}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition-colors gap-2">
                <ExternalLink className="h-4 w-4" /> Open email provider
              </a>
              <p className="text-xs text-muted-foreground">After clicking the link in your email, come back and <Link href="/login" className="text-primary hover:underline">sign in</Link></p>
            </div>
          )}

          {step === "done" && hasEmailService && (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Account created successfully!</p>
            </div>
          )}

          {step === "form" && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">Sign in</Link>
            </p>
          )}
        </div>
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/30 border-l border-border/50">
        <div className="max-w-md text-center px-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6"><Shield className="h-8 w-8 text-primary" /></div>
          <h2 className="text-2xl font-bold mb-4">luau.uwu</h2>
          <p className="text-muted-foreground">Professional script protection and key management for Roblox developers.</p>
        </div>
      </div>
    </div>
  );
}
