"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/context/ThemeContext";

export default function UserActions() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const {
    alertsLoading,
    lastUpdatedAt,
    visibleAlerts,
    unreadCount,
    refresh,
    markAllViewed,
    clearAll,
    dismiss,
  } = useNotifications({ stream: true, pollIntervalMs: 60_000 });
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (notifOpen) {
      void refresh(true);
    }
  }, [notifOpen, refresh]);

  const formatAlertTime = useCallback((value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ar-EG", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatTimeShort = useCallback((value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }, []);

  const alertIcon = useCallback((type: "low_stock" | "warning" | "info") => {
    if (type === "low_stock") return "bx bx-line-chart-down";
    if (type === "warning") return "bx bx-error";
    return "bx bx-info-circle";
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
            {unreadCount > 0 ? (
              <span className="notif-count">{unreadCount > 9 ? "9+" : unreadCount}</span>
            ) : null}
          </button>
          <div className="notif-dropdown">
            <div className="notif-header">
              <h4>التنبيهات</h4>
              <div className="notif-actions">
                <button
                  className="notif-action-btn"
                  type="button"
                  onClick={() => {
                    router.push("/notifications");
                    setNotifOpen(false);
                  }}
                >
                  عرض الكل
                </button>
                <button
                  className="notif-action-btn"
                  type="button"
                  onClick={() => void refresh(true)}
                  disabled={alertsLoading}
                >
                  تحديث
                </button>
                <button
                  className="notif-action-btn"
                  type="button"
                  onClick={markAllViewed}
                  disabled={unreadCount === 0}
                >
                  تعليم كمقروء
                </button>
                <button
                  className="notif-action-btn danger"
                  type="button"
                  onClick={clearAll}
                  disabled={visibleAlerts.length === 0}
                >
                  مسح الكل
                </button>
              </div>
            </div>
            <div className="notif-meta">
              {lastUpdatedAt ? `آخر تحديث ${formatTimeShort(lastUpdatedAt)}` : "—"}
            </div>
            <div className="alerts-scroll">
              <div className="alerts-grid">
                {alertsLoading ? (
                  <div className="alert-empty">جاري تحديث التنبيهات...</div>
                ) : visibleAlerts.length === 0 ? (
                  <div className="alert-empty">لا توجد تنبيهات حالياً</div>
                ) : (
                  visibleAlerts.map((alert, index) => (
                    <div key={`${alert.id}-${index}`} className={`alert-card ${alert.type}`}>
                      <div className="alert-icon">
                        <i className={alertIcon(alert.type)}></i>
                      </div>
                      <div className="alert-content">
                        <div className="alert-title-row">
                          <strong>{alert.title}</strong>
                          {alert.createdAt ? (
                            <span className="alert-time">{formatAlertTime(alert.createdAt)}</span>
                          ) : null}
                        </div>
                        <p>{alert.message}</p>
                      </div>
                      <button
                        className="alert-dismiss"
                        type="button"
                        title="إخفاء التنبيه"
                        onClick={() => dismiss(alert.id)}
                      >
                        <i className="bx bx-x"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
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
            {user?.avatarUrl ? (
              <img className="avatar-img" src={user.avatarUrl} alt={user.fullName || "User"} />
            ) : (
              <span className="avatar">{avatarLabel}</span>
            )}
            <div className="profile-meta">
              <span className="profile-name">{user?.fullName || "مستخدم النظام"}</span>
              <span className="profile-role">{roleLabel}</span>
            </div>
            <i className="bx bx-chevron-down"></i>
          </button>
          <div className="profile-dropdown">
            <button
              className="profile-item"
              type="button"
              onClick={() => {
                toggleTheme();
              }}
            >
              <i className={theme === "dark" ? "bx bx-sun" : "bx bx-moon"}></i>
              {theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
            </button>
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
