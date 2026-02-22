"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const { branding } = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trialResetLoading, setTrialResetLoading] = useState(false);
  const [trialResetMessage, setTrialResetMessage] = useState("");
  const [trialResetError, setTrialResetError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const trialResetEnabled = process.env.NEXT_PUBLIC_TRIAL_PASSWORD_RESET_ENABLED !== "false";
  const requestedNext = searchParams.get("next");
  const nextPath =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!mounted || !response.ok) return;
        router.replace("/dashboard");
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || "فشل تسجيل الدخول");
        return;
      }
      await refresh();
      router.replace(nextPath);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleTrialReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTrialResetError("");
    setTrialResetMessage("");

    if (resetPassword !== resetConfirmPassword) {
      setTrialResetError("تأكيد كلمة المرور غير متطابق");
      return;
    }

    setTrialResetLoading(true);
    try {
      const response = await fetch("/api/auth/trial-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          password: resetPassword,
          confirmPassword: resetConfirmPassword,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.ok) {
        setTrialResetError(payload.error?.message || "تعذر تغيير كلمة المرور");
        return;
      }

      setTrialResetMessage("تم تحديث كلمة المرور (Trial). يمكنك تسجيل الدخول الآن.");
      setEmail(resetEmail);
      setPassword("");
      setResetPassword("");
      setResetConfirmPassword("");
    } catch {
      setTrialResetError("تعذر الاتصال بالخادم");
    } finally {
      setTrialResetLoading(false);
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-brand">
        <h1>{branding.brandName}</h1>
        <p>{branding.brandTagline || "تسجيل دخول المستخدمين المعتمدين"}</p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label>البريد الإلكتروني</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
          required
        />

        <label>كلمة المرور</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••••"
          required
        />

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
        </button>
      </form>

      {trialResetEnabled ? (
        <form className="form" onSubmit={handleTrialReset}>
          <p className="hint">وضع تجريبي: تعيين كلمة مرور جديدة عبر البريد الإلكتروني.</p>

          <label>البريد الإلكتروني</label>
          <input
            type="email"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
            placeholder="name@company.com"
            required
          />

          <label>كلمة المرور الجديدة</label>
          <input
            type="password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            placeholder="••••••••••"
            required
          />

          <label>تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            value={resetConfirmPassword}
            onChange={(event) => setResetConfirmPassword(event.target.value)}
            placeholder="••••••••••"
            required
          />

          {trialResetError ? <p className="auth-error">{trialResetError}</p> : null}
          {trialResetMessage ? <p className="hint">{trialResetMessage}</p> : null}

          <button className="ghost" type="submit" disabled={trialResetLoading}>
            {trialResetLoading ? "جارٍ التحديث..." : "تعيين كلمة المرور (Trial)"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
