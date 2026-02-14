export default function NotFound() {
  return (
    <div className="auth-shell">
      <section className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-brand">
          <h1>الصفحة غير موجودة</h1>
          <p>الرابط الذي طلبته غير متوفر. يمكنك العودة للواجهة الرئيسية.</p>
        </div>
        <a className="primary" href="/dashboard">
          العودة إلى لوحة التحكم
        </a>
      </section>
    </div>
  );
}
