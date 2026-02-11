"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { money } from "@/lib/format";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function UserActions() {
  const router = useRouter();
  const { state } = useAppState();
  const { user, logout } = useAuth();
  const { pushToast } = useToast();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const alerts = useMemo(() => {
    const items: { type: string; title: string; message: string }[] = [];
    state.materials.forEach((material) => {
      if (material.stock <= material.minStock) {
        items.push({
          type: "low_stock",
          title: "مخزون منخفض",
          message: `المادة ${material.name} أقل من الحد الأدنى.`,
        });
      }
    });
    if (state.waste.length > 0) {
      const latest = state.waste[0];
      items.push({
        type: "warning",
        title: "هدر اليوم",
        message: `تم تسجيل هدر ${latest.material} بقيمة ${money(latest.cost)}.`,
      });
    }
    return items;
  }, [state.materials, state.waste]);

  const roleLabel = useMemo(() => {
    if (!user) return "مستخدم";
    if (user.isOwner) return "Owner";
    return user.roles.join("، ") || "بدون دور";
  }, [user]);

  const avatarLabel = useMemo(() => {
    const value = user?.fullName || user?.email || "مستخدم";
    return value.trim().charAt(0).toUpperCase();
  }, [user]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <>
      <div className="user-actions" id="userActions">
        <div className={`notif-menu ${notifOpen ? "open" : ""}`} ref={notifRef}>
          <button
            className="icon-btn notif-btn"
            title="التنبيهات"
            onClick={(event) => {
              event.stopPropagation();
              setNotifOpen((prev) => !prev);
            }}
            type="button"
          >
            <i className="bx bx-bell"></i>
            <span className={`notif-dot ${alerts.length > 0 ? "active" : ""}`}></span>
          </button>
          <div className="notif-dropdown">
            <div className="notif-header">
              <h4>التنبيهات</h4>
            </div>
            <div className="alerts-grid">
              {alerts.length === 0 ? (
                <div className="alert-empty">لا توجد تنبيهات حالياً</div>
              ) : (
                alerts.map((alert, index) => (
                  <div key={`${alert.type}-${index}`} className={`alert-card ${alert.type}`}>
                    <div className="alert-icon">
                      <i className="bx bx-bell"></i>
                    </div>
                    <div className="alert-content">
                      <strong>{alert.title}</strong>
                      <p>{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={`profile-menu ${profileOpen ? "open" : ""}`} ref={profileRef}>
          <button
            className="profile-btn"
            onClick={(event) => {
              event.stopPropagation();
              setProfileOpen((prev) => !prev);
            }}
            type="button"
          >
            <span className="avatar">{avatarLabel}</span>
            <div className="profile-meta">
              <span className="profile-name">{user?.fullName || "مستخدم النظام"}</span>
              <span className="profile-role">{roleLabel}</span>
            </div>
            <i className="bx bx-chevron-down"></i>
          </button>
          <div className="profile-dropdown">
            <button
              className="profile-item"
              onClick={() => {
                router.push("/settings");
                setProfileOpen(false);
              }}
              type="button"
            >
              <i className="bx bx-cog"></i>
              الإعدادات
            </button>
            <button
              className="profile-item"
              onClick={() => {
                router.push("/hr");
                setProfileOpen(false);
              }}
              type="button"
            >
              <i className="bx bx-group"></i>
              الموظفون
            </button>
            <button
              className="profile-item danger"
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setLogoutOpen(true);
              }}
            >
              <i className="bx bx-log-out"></i>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={logoutOpen}
        title="تسجيل الخروج"
        message="هل تريد تسجيل الخروج من النظام الآن؟"
        confirmLabel="تسجيل الخروج"
        onClose={() => {
          setLogoutOpen(false);
          pushToast("تم إلغاء تسجيل الخروج", "info");
        }}
        onConfirm={() => {
          setLogoutOpen(false);
          void (async () => {
            try {
              await logout();
              router.replace("/login");
              pushToast("تم تسجيل الخروج", "success");
            } catch {
              pushToast("تعذر تسجيل الخروج", "error");
            }
          })();
        }}
      />
    </>
  );
}
