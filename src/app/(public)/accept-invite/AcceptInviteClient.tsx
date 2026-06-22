"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";

type InviteDetails = {
  email: string;
  role: { id: string; name: string };
  usable: boolean;
  status: string;
  expiresAt: string;
};

export default function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const { branding } = useBranding();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    if (!token) {
      setError("رابط الدعوة غير صالح");
      return;
    }

    fetch(`/api/auth/invite-details?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          ok: boolean;
          data?: { invite: InviteDetails };
          error?: { message?: string };
        };
        if (!mounted) return;
        if (!response.ok || !payload.ok || !payload.data) {
          setError(payload.error?.message || "تعذر تحميل بيانات الدعوة");
          return;
        }
        setInvite(payload.data.invite);
      })
      .catch(() => {
        if (mounted) setError("تعذر الاتصال بالخادم");
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invite?.usable) return;
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fullName, password }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || "تعذر تفعيل الحساب");
        return;
      }
      await refresh();
      router.replace("/dashboard");
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-brand">
        <h1>{branding.brandName}</h1>
        <p>{branding.brandTagline || "أكمل بياناتك لإنهاء التسجيل من رابط الدعوة"}</p>
      </div>

      {invite ? (
        <div className="invite-summary">
          <div className="row-line">
            <span>البريد</span>
            <strong>{invite.email}</strong>
          </div>
          <div className="row-line">
            <span>الدور</span>
            <strong>{invite.role.name}</strong>
          </div>
          <div className="row-line">
            <span>ينتهي</span>
            <strong>{new Date(invite.expiresAt).toLocaleString("ar-EG")}</strong>
          </div>
        </div>
      ) : null}

      <form className="form" onSubmit={handleSubmit}>
        <label>الاسم الكامل</label>
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />

        <label>كلمة المرور</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <label>تأكيد كلمة المرور</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="primary" type="submit" disabled={loading || !invite?.usable}>
          {loading ? "جارٍ التفعيل..." : "تفعيل الحساب"}
        </button>
      </form>
    </section>
  );
}
