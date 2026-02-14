"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Branding, useBranding } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";

type SetupStep = "welcome" | "owner" | "branding" | "taxes" | "done";

type TaxRow = {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
};

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const STEP_LABELS: Record<SetupStep, string> = {
  welcome: "مرحبا",
  owner: "مالك النظام",
  branding: "الهوية البصرية",
  taxes: "الضرائب",
  done: "الإنهاء",
};

function normalizeHexInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function isHexColor(value: string) {
  return HEX_COLOR.test(value);
}

export default function SetupPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { authenticated, refresh: refreshAuth } = useAuth();
  const { branding, setBranding, refresh: refreshBranding } = useBranding();

  const [step, setStep] = useState<SetupStep>("welcome");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taxes, setTaxes] = useState<TaxRow[]>([]);
  const [useDefaultTax, setUseDefaultTax] = useState(false);
  const [setupInfo, setSetupInfo] = useState({ isComplete: false, hasOwner: true });

  const [ownerForm, setOwnerForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [brandingForm, setBrandingForm] = useState<Branding>({
    brandName: "",
    brandTagline: "",
    logoUrl: "",
    primaryColor: "#e06d4c",
    secondaryColor: "#2f8f83",
    backgroundColor: "#f7f3ee",
    cardColor: "#ffffff",
    borderColor: "#e6e1db",
    topbarColor: "#ffffff",
    topbarTextColor: "#1b1b1b",
    tableHeaderColor: "#fbfaf8",
    tableHeaderTextColor: "#6b6b6b",
    backgroundOpacity: 100,
    cardOpacity: 100,
    topbarOpacity: 0,
    tableHeaderOpacity: 100,
    sidebarOpacity: 100,
    sidebarColor: "#1f2a2b",
    sidebarTextColor: "#f6f3ef",
  });

  const [taxForm, setTaxForm] = useState({
    name: "",
    rate: 0,
  });

  const requiresOwner = !setupInfo.hasOwner;
  const stepOrder = useMemo<SetupStep[]>(
    () => ["welcome", ...(requiresOwner ? ["owner"] : []), "branding", "taxes", "done"],
    [requiresOwner]
  );
  const stepIndex = Math.max(0, stepOrder.indexOf(step)) + 1;
  const stepCount = stepOrder.length;

  const goNext = useCallback(() => {
    const index = stepOrder.indexOf(step);
    if (index < stepOrder.length - 1) {
      setStep(stepOrder[index + 1]);
    }
  }, [step, stepOrder]);

  const goPrev = useCallback(() => {
    const index = stepOrder.indexOf(step);
    if (index > 0) {
      setStep(stepOrder[index - 1]);
    }
  }, [step, stepOrder]);

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError) {
        pushToast(error.message || fallback, "error");
        return;
      }
      pushToast(fallback, "error");
    },
    [pushToast]
  );

  useEffect(() => {
    if (!stepOrder.includes(step)) {
      setStep(stepOrder[0]);
    }
  }, [step, stepOrder]);

  useEffect(() => {
    setBrandingForm({
      brandName: branding.brandName,
      brandTagline: branding.brandTagline || "",
      logoUrl: branding.logoUrl || "",
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      backgroundColor: branding.backgroundColor,
      cardColor: branding.cardColor,
      borderColor: branding.borderColor,
      topbarColor: branding.topbarColor,
      topbarTextColor: branding.topbarTextColor,
      tableHeaderColor: branding.tableHeaderColor,
      tableHeaderTextColor: branding.tableHeaderTextColor,
      backgroundOpacity: branding.backgroundOpacity,
      cardOpacity: branding.cardOpacity,
      topbarOpacity: branding.topbarOpacity,
      tableHeaderOpacity: branding.tableHeaderOpacity,
      sidebarOpacity: branding.sidebarOpacity,
      sidebarColor: branding.sidebarColor,
      sidebarTextColor: branding.sidebarTextColor,
    });
  }, [branding]);

  const fetchSetupState = useCallback(async (options?: { forceTaxes?: boolean }) => {
    setLoading(true);
    try {
      const payload = await apiRequest<{ setup: { isComplete: boolean; hasOwner: boolean } }>("/api/system/setup");
      setSetupInfo({ isComplete: payload.setup.isComplete, hasOwner: payload.setup.hasOwner });
      if (payload.setup.isComplete) {
        router.replace("/dashboard");
        return;
      }
      if (payload.setup.hasOwner && (authenticated || options?.forceTaxes)) {
        const taxesPayload = await apiRequest<{ taxes: TaxRow[] }>("/api/settings/taxes");
        setTaxes(taxesPayload.taxes || []);
      }
    } catch (error) {
      handleError(error, "تعذر تحميل إعدادات البداية");
    } finally {
      setLoading(false);
    }
  }, [authenticated, handleError, router]);

  useEffect(() => {
    void fetchSetupState();
  }, [fetchSetupState]);

  const defaultTax = useMemo(() => taxes.find((tax) => tax.isDefault && tax.isActive) || null, [taxes]);

  const handleOwnerSignup = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!ownerForm.fullName.trim()) {
      pushToast("أدخل اسم المالك", "error");
      return;
    }
    if (!ownerForm.email.trim()) {
      pushToast("أدخل البريد الإلكتروني", "error");
      return;
    }
    if (!ownerForm.password) {
      pushToast("أدخل كلمة المرور", "error");
      return;
    }
    if (ownerForm.password !== ownerForm.confirmPassword) {
      pushToast("تأكيد كلمة المرور غير مطابق", "error");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<{ user: { id: string } }>("/api/system/owner", {
        method: "POST",
        body: JSON.stringify(ownerForm),
      });
      await refreshAuth();
      await fetchSetupState({ forceTaxes: true });
      pushToast("تم إنشاء حساب المالك", "success");
      goNext();
    } catch (error) {
      handleError(error, "تعذر إنشاء حساب المالك");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!brandingForm.brandName.trim()) {
      pushToast("أدخل اسم العلامة", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = await apiRequest<{ branding: Branding }>("/api/settings/branding", {
        method: "PATCH",
        body: JSON.stringify({
          brandName: brandingForm.brandName,
          brandTagline: brandingForm.brandTagline || null,
          logoUrl: brandingForm.logoUrl || null,
          primaryColor: brandingForm.primaryColor,
          secondaryColor: brandingForm.secondaryColor,
          backgroundColor: brandingForm.backgroundColor,
          cardColor: brandingForm.cardColor,
          borderColor: brandingForm.borderColor,
          topbarColor: brandingForm.topbarColor,
          topbarTextColor: brandingForm.topbarTextColor,
          tableHeaderColor: brandingForm.tableHeaderColor,
          tableHeaderTextColor: brandingForm.tableHeaderTextColor,
          backgroundOpacity: brandingForm.backgroundOpacity,
          cardOpacity: brandingForm.cardOpacity,
          topbarOpacity: brandingForm.topbarOpacity,
          tableHeaderOpacity: brandingForm.tableHeaderOpacity,
          sidebarOpacity: brandingForm.sidebarOpacity,
          sidebarColor: brandingForm.sidebarColor,
          sidebarTextColor: brandingForm.sidebarTextColor,
        }),
      });
      setBranding(payload.branding);
      await refreshBranding();
      pushToast("تم حفظ الهوية البصرية", "success");
      goNext();
    } catch (error) {
      handleError(error, "تعذر حفظ الهوية البصرية");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTax = async () => {
    if (!useDefaultTax) {
      goNext();
      return;
    }

    if (!taxForm.name.trim()) {
      pushToast("أدخل اسم الضريبة", "error");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<{ tax: TaxRow }>("/api/settings/taxes", {
        method: "POST",
        body: JSON.stringify({
          name: taxForm.name,
          rate: taxForm.rate,
          isDefault: true,
          isActive: true,
        }),
      });
      const taxesPayload = await apiRequest<{ taxes: TaxRow[] }>("/api/settings/taxes");
      setTaxes(taxesPayload.taxes || []);
      pushToast("تمت إضافة الضريبة الافتراضية", "success");
      goNext();
    } catch (error) {
      handleError(error, "تعذر حفظ الضريبة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await apiRequest<{ setup: { isComplete: boolean } }>("/api/system/setup", {
        method: "POST",
      });
      pushToast("تم إنهاء الإعدادات الأساسية", "success");
      router.replace("/dashboard");
    } catch (error) {
      handleError(error, "تعذر إنهاء الإعدادات");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="setup-card">
        <div className="card wide">
          <p className="hint">جارٍ تحميل إعدادات البداية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-card">
      <div className="card wide setup-header">
        <div>
          <h2>إعداد النظام لأول مرة</h2>
          <p className="hint">خطوات قصيرة لتجهيز النظام للعمل. بعد إنشاء حساب المالك يمكنك تخطي أي خطوة.</p>
          <span className="setup-counter">الخطوة {stepIndex} من {stepCount}</span>
        </div>
        {setupInfo.hasOwner ? (
          <button className="ghost" type="button" onClick={handleFinish} disabled={submitting}>
            تخطي الإعداد الآن
          </button>
        ) : null}
      </div>

      <div className="setup-progress">
        {stepOrder.map((item, index) => (
          <div key={item} className={`setup-step ${stepIndex >= index + 1 ? "active" : ""}`}>
            <span>{index + 1}</span>
            <p>{STEP_LABELS[item]}</p>
          </div>
        ))}
      </div>

      {step === "welcome" && (
        <div className="card wide setup-intro">
          <div className="setup-hero">
            <div className="setup-hero-copy">
              <span className="setup-kicker">مرحباً بك</span>
              <h2>أهلاً بك في نظام الإدارة</h2>
              <p className="hint">
                سنساعدك في إعداد الحساب الأساسي والهوية البصرية والضرائب خلال دقائق قليلة.
              </p>
              <div className="setup-list">
                <div>إنشاء حساب مالك النظام لأول مرة.</div>
                <div>ضبط الهوية البصرية والألوان الرسمية.</div>
                <div>تحديد الضرائب الافتراضية إذا رغبت.</div>
              </div>
            </div>
            <div className="setup-hero-side">
              <div className="setup-hero-card">
                <strong>ملاحظات سريعة</strong>
                <p className="hint">
                  يمكنك العودة لاحقًا لتعديل الإعدادات من صفحة الإعدادات في أي وقت.
                </p>
              </div>
              <div className="setup-hero-card accent">
                <strong>المدة المتوقعة</strong>
                <p className="hint">3 إلى 5 دقائق فقط</p>
              </div>
            </div>
          </div>
          <div className="setup-actions">
            <button className="primary" type="button" onClick={goNext} disabled={submitting}>
              ابدأ الإعداد
            </button>
          </div>
        </div>
      )}

      {step === "owner" && (
        <div className="card wide">
          <div className="section-header-actions no-tip">
            <div>
              <h2>إنشاء حساب المالك</h2>
              <p className="hint">
                هذا الحساب يمتلك جميع الصلاحيات ويستخدم لإعداد النظام وإدارة المستخدمين.
              </p>
            </div>
          </div>
          <form className="form setup-owner-form" onSubmit={handleOwnerSignup}>
            <div className="setup-owner-grid">
              <label className="field">
                <span>اسم المالك</span>
                <input
                  type="text"
                  value={ownerForm.fullName}
                  onChange={(event) =>
                    setOwnerForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>البريد الإلكتروني</span>
                <input
                  type="email"
                  value={ownerForm.email}
                  onChange={(event) =>
                    setOwnerForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>كلمة المرور</span>
                <input
                  type="password"
                  value={ownerForm.password}
                  onChange={(event) =>
                    setOwnerForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>تأكيد كلمة المرور</span>
                <input
                  type="password"
                  value={ownerForm.confirmPassword}
                  onChange={(event) =>
                    setOwnerForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                  required
                />
              </label>
            </div>
            <p className="hint">كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم ورمز.</p>
            <div className="setup-actions">
              <button className="ghost" type="button" onClick={goPrev} disabled={submitting}>
                رجوع
              </button>
              <button className="primary" type="submit" disabled={submitting}>
                إنشاء حساب المالك
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "branding" && (
        <div className="card wide">
          <div className="section-header-actions no-tip">
            <h2>الهوية البصرية</h2>
            <div className="branding-preview">
              <div className="branding-logo">
                {brandingForm.logoUrl ? (
                  <img src={brandingForm.logoUrl} alt={brandingForm.brandName} />
                ) : (
                  <span>{brandingForm.brandName.slice(0, 1) || "P"}</span>
                )}
              </div>
              <div className="branding-text">
                <strong>{brandingForm.brandName || "Premium POS"}</strong>
                <span>{brandingForm.brandTagline || "مطعم ومقهى"}</span>
              </div>
            </div>
          </div>

          <div className="branding-grid">
            <label className="field">
              <span>اسم العلامة</span>
              <input
                type="text"
                value={brandingForm.brandName}
                onChange={(event) =>
                  setBrandingForm((prev) => ({ ...prev, brandName: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>الوصف المختصر</span>
              <input
                type="text"
                value={brandingForm.brandTagline}
                onChange={(event) =>
                  setBrandingForm((prev) => ({ ...prev, brandTagline: event.target.value }))
                }
                placeholder="مطعم ومقهى"
              />
            </label>
            <label className="field">
              <span>رابط الشعار</span>
              <input
                type="text"
                value={brandingForm.logoUrl}
                onChange={(event) =>
                  setBrandingForm((prev) => ({ ...prev, logoUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </label>
            <label className="field">
              <span>لون العلامة الأساسي</span>
              <div className="color-input">
                <input
                  type="color"
                  value={isHexColor(brandingForm.primaryColor) ? brandingForm.primaryColor : "#e06d4c"}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, primaryColor: event.target.value }))
                  }
                />
                <input
                  type="text"
                  value={brandingForm.primaryColor}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, primaryColor: normalizeHexInput(event.target.value) }))
                  }
                  placeholder="#E06D4C"
                />
                <span
                  className="color-preview"
                  style={{
                    background: isHexColor(brandingForm.primaryColor) ? brandingForm.primaryColor : "#e06d4c",
                  }}
                />
              </div>
            </label>
            <label className="field">
              <span>لون ثانوي</span>
              <div className="color-input">
                <input
                  type="color"
                  value={isHexColor(brandingForm.secondaryColor) ? brandingForm.secondaryColor : "#2f8f83"}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, secondaryColor: event.target.value }))
                  }
                />
                <input
                  type="text"
                  value={brandingForm.secondaryColor}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, secondaryColor: normalizeHexInput(event.target.value) }))
                  }
                  placeholder="#2F8F83"
                />
                <span
                  className="color-preview"
                  style={{
                    background: isHexColor(brandingForm.secondaryColor) ? brandingForm.secondaryColor : "#2f8f83",
                  }}
                />
              </div>
            </label>
            <label className="field">
              <span>لون خلفية النظام</span>
              <div className="color-input">
                <input
                  type="color"
                  value={isHexColor(brandingForm.backgroundColor) ? brandingForm.backgroundColor : "#f7f3ee"}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, backgroundColor: event.target.value }))
                  }
                />
                <input
                  type="text"
                  value={brandingForm.backgroundColor}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, backgroundColor: normalizeHexInput(event.target.value) }))
                  }
                  placeholder="#F7F3EE"
                />
                <span
                  className="color-preview"
                  style={{
                    background: isHexColor(brandingForm.backgroundColor) ? brandingForm.backgroundColor : "#f7f3ee",
                  }}
                />
              </div>
              <div className="opacity-input">
                <span>الشفافية</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={brandingForm.backgroundOpacity}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({
                      ...prev,
                      backgroundOpacity: Number(event.target.value || 0),
                    }))
                  }
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={brandingForm.backgroundOpacity}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({
                      ...prev,
                      backgroundOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                    }))
                  }
                />
              </div>
            </label>
            <label className="field">
              <span>لون الشريط الجانبي</span>
              <div className="color-input">
                <input
                  type="color"
                  value={isHexColor(brandingForm.sidebarColor) ? brandingForm.sidebarColor : "#1f2a2b"}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, sidebarColor: event.target.value }))
                  }
                />
                <input
                  type="text"
                  value={brandingForm.sidebarColor}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, sidebarColor: normalizeHexInput(event.target.value) }))
                  }
                  placeholder="#1F2A2B"
                />
                <span
                  className="color-preview"
                  style={{
                    background: isHexColor(brandingForm.sidebarColor) ? brandingForm.sidebarColor : "#1f2a2b",
                  }}
                />
              </div>
              <div className="opacity-input">
                <span>الشفافية</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={brandingForm.sidebarOpacity}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({
                      ...prev,
                      sidebarOpacity: Number(event.target.value || 0),
                    }))
                  }
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={brandingForm.sidebarOpacity}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({
                      ...prev,
                      sidebarOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                    }))
                  }
                />
              </div>
            </label>
            <label className="field">
              <span>لون نص الشريط الجانبي</span>
              <div className="color-input">
                <input
                  type="color"
                  value={isHexColor(brandingForm.sidebarTextColor) ? brandingForm.sidebarTextColor : "#f6f3ef"}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({ ...prev, sidebarTextColor: event.target.value }))
                  }
                />
                <input
                  type="text"
                  value={brandingForm.sidebarTextColor}
                  onChange={(event) =>
                    setBrandingForm((prev) => ({
                      ...prev,
                      sidebarTextColor: normalizeHexInput(event.target.value),
                    }))
                  }
                  placeholder="#F6F3EF"
                />
                <span
                  className="color-preview"
                  style={{
                    background: isHexColor(brandingForm.sidebarTextColor) ? brandingForm.sidebarTextColor : "#f6f3ef",
                  }}
                />
              </div>
            </label>
          </div>
          <details className="advanced-details">
            <summary>ألوان متقدمة للواجهة (اختياري)</summary>
            <div className="branding-grid">
              <label className="field">
                <span>لون البطاقات</span>
                <div className="color-input">
                  <input
                    type="color"
                    value={isHexColor(brandingForm.cardColor) ? brandingForm.cardColor : "#ffffff"}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, cardColor: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    value={brandingForm.cardColor}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, cardColor: normalizeHexInput(event.target.value) }))
                    }
                    placeholder="#FFFFFF"
                  />
                  <span
                    className="color-preview"
                    style={{
                      background: isHexColor(brandingForm.cardColor) ? brandingForm.cardColor : "#ffffff",
                    }}
                  />
                </div>
                <div className="opacity-input">
                  <span>الشفافية</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={brandingForm.cardOpacity}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        cardOpacity: Number(event.target.value || 0),
                      }))
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={brandingForm.cardOpacity}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        cardOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                      }))
                    }
                  />
                </div>
              </label>
              <label className="field">
                <span>لون الحدود</span>
                <div className="color-input">
                  <input
                    type="color"
                    value={isHexColor(brandingForm.borderColor) ? brandingForm.borderColor : "#e6e1db"}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, borderColor: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    value={brandingForm.borderColor}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, borderColor: normalizeHexInput(event.target.value) }))
                    }
                    placeholder="#E6E1DB"
                  />
                  <span
                    className="color-preview"
                    style={{
                      background: isHexColor(brandingForm.borderColor) ? brandingForm.borderColor : "#e6e1db",
                    }}
                  />
                </div>
              </label>
              <label className="field">
                <span>لون الشريط العلوي</span>
                <div className="color-input">
                  <input
                    type="color"
                    value={isHexColor(brandingForm.topbarColor) ? brandingForm.topbarColor : "#ffffff"}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, topbarColor: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    value={brandingForm.topbarColor}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, topbarColor: normalizeHexInput(event.target.value) }))
                    }
                    placeholder="#FFFFFF"
                  />
                  <span
                    className="color-preview"
                    style={{
                      background: isHexColor(brandingForm.topbarColor) ? brandingForm.topbarColor : "#ffffff",
                    }}
                  />
                </div>
                <div className="opacity-input">
                  <span>الشفافية</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={brandingForm.topbarOpacity}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        topbarOpacity: Number(event.target.value || 0),
                      }))
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={brandingForm.topbarOpacity}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        topbarOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                      }))
                    }
                  />
                </div>
              </label>
              <label className="field">
                <span>لون نص الشريط العلوي</span>
                <div className="color-input">
                  <input
                    type="color"
                    value={isHexColor(brandingForm.topbarTextColor) ? brandingForm.topbarTextColor : "#1b1b1b"}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, topbarTextColor: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    value={brandingForm.topbarTextColor}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        topbarTextColor: normalizeHexInput(event.target.value),
                      }))
                    }
                    placeholder="#1B1B1B"
                  />
                  <span
                    className="color-preview"
                    style={{
                      background: isHexColor(brandingForm.topbarTextColor)
                        ? brandingForm.topbarTextColor
                        : "#1b1b1b",
                    }}
                  />
                </div>
              </label>
              <label className="field">
                <span>لون رؤوس الجداول</span>
                <div className="color-input">
                  <input
                    type="color"
                    value={
                      isHexColor(brandingForm.tableHeaderColor) ? brandingForm.tableHeaderColor : "#fbfaf8"
                    }
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, tableHeaderColor: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    value={brandingForm.tableHeaderColor}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        tableHeaderColor: normalizeHexInput(event.target.value),
                      }))
                    }
                    placeholder="#FBFAF8"
                  />
                  <span
                    className="color-preview"
                    style={{
                      background: isHexColor(brandingForm.tableHeaderColor)
                        ? brandingForm.tableHeaderColor
                        : "#fbfaf8",
                    }}
                  />
                </div>
                <div className="opacity-input">
                  <span>الشفافية</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={brandingForm.tableHeaderOpacity}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        tableHeaderOpacity: Number(event.target.value || 0),
                      }))
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={brandingForm.tableHeaderOpacity}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        tableHeaderOpacity: Math.min(100, Math.max(0, Number(event.target.value || 0))),
                      }))
                    }
                  />
                </div>
              </label>
              <label className="field">
                <span>لون نص رؤوس الجداول</span>
                <div className="color-input">
                  <input
                    type="color"
                    value={
                      isHexColor(brandingForm.tableHeaderTextColor)
                        ? brandingForm.tableHeaderTextColor
                        : "#6b6b6b"
                    }
                    onChange={(event) =>
                      setBrandingForm((prev) => ({ ...prev, tableHeaderTextColor: event.target.value }))
                    }
                  />
                  <input
                    type="text"
                    value={brandingForm.tableHeaderTextColor}
                    onChange={(event) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        tableHeaderTextColor: normalizeHexInput(event.target.value),
                      }))
                    }
                    placeholder="#6B6B6B"
                  />
                  <span
                    className="color-preview"
                    style={{
                      background: isHexColor(brandingForm.tableHeaderTextColor)
                        ? brandingForm.tableHeaderTextColor
                        : "#6b6b6b",
                    }}
                  />
                </div>
              </label>
            </div>
          </details>

          <div className="setup-actions">
            {stepIndex > 1 ? (
              <button className="ghost" type="button" onClick={goPrev} disabled={submitting}>
                رجوع
              </button>
            ) : null}
            <button className="primary" type="button" onClick={handleSaveBranding} disabled={submitting}>
              حفظ واستمرار
            </button>
          </div>
        </div>
      )}

      {step === "taxes" && (
        <div className="card wide">
          <h2>الضرائب الافتراضية</h2>
          <p className="hint">يمكنك إنشاء ضريبة افتراضية أو تخطي الخطوة وتعيينها لاحقًا.</p>

          {defaultTax ? (
            <div className="danger-box" style={{ marginTop: 12 }}>
              <strong>ضريبة افتراضية حالية</strong>
              <p>{defaultTax.name} بنسبة {defaultTax.rate}%</p>
            </div>
          ) : null}

          <label className="checkbox" style={{ marginTop: 16 }}>
            <input
              type="checkbox"
              checked={useDefaultTax}
              onChange={(event) => setUseDefaultTax(event.target.checked)}
            />
            إنشاء ضريبة افتراضية الآن
          </label>

          {useDefaultTax && (
            <div className="form" style={{ marginTop: 12 }}>
              <label>اسم الضريبة</label>
              <input
                type="text"
                value={taxForm.name}
                onChange={(event) => setTaxForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <label>النسبة (%)</label>
              <input
                type="number"
                value={taxForm.rate}
                min={0}
                max={100}
                step={0.5}
                onChange={(event) => setTaxForm((prev) => ({ ...prev, rate: Number(event.target.value || 0) }))}
              />
            </div>
          )}

          <div className="setup-actions">
            <button className="ghost" type="button" onClick={goPrev} disabled={submitting}>
              رجوع
            </button>
            <button className="primary" type="button" onClick={handleSaveTax} disabled={submitting}>
              {useDefaultTax ? "حفظ واستمرار" : "تخطي والاستمرار"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="card wide">
          <h2>كل شيء جاهز</h2>
          <p className="hint">يمكنك تعديل هذه الإعدادات لاحقًا من صفحة الإعدادات.</p>
          <div className="setup-summary">
            <div>
              <strong>العلامة</strong>
              <p>{brandingForm.brandName}</p>
            </div>
            <div>
              <strong>الضريبة الافتراضية</strong>
              <p>{defaultTax ? `${defaultTax.name} (${defaultTax.rate}%)` : "غير محددة"}</p>
            </div>
          </div>
          <div className="setup-actions">
            <button className="ghost" type="button" onClick={goPrev} disabled={submitting}>
              رجوع
            </button>
            <button className="primary" type="button" onClick={handleFinish} disabled={submitting}>
              إنهاء الإعداد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
