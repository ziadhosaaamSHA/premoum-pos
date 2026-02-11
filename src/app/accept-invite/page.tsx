import { Suspense } from "react";
import AcceptInviteClient from "@/app/accept-invite/AcceptInviteClient";

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <section className="auth-card">
          <div className="auth-brand">
            <h1>تفعيل حساب جديد</h1>
            <p>جارٍ تحميل بيانات الدعوة...</p>
          </div>
        </section>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}
