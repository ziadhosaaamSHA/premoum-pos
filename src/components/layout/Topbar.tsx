"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getPageMeta } from "@/lib/routes";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import UserActions from "@/components/layout/UserActions";
import ConfirmModal from "@/components/ui/ConfirmModal";

type TopbarProps = {
  onMenuToggle: () => void;
  compact?: boolean;
};

type ActiveShift = {
  status: "idle" | "running" | "paused";
  employeeId: string | null;
  startedAt: string | null;
  pauseStartedAt: string | null;
  pauses: Array<{ start: string; end?: string }>;
};

type ShiftMePayload = {
  activeShift: ActiveShift;
};

const idleShift: ActiveShift = {
  status: "idle",
  employeeId: null,
  startedAt: null,
  pauseStartedAt: null,
  pauses: [],
};

export default function Topbar({ onMenuToggle, compact }: TopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [title, subtitle] = useMemo(() => getPageMeta(pathname), [pathname]);
  const showShiftControls = user ? !user.isOwner && !user.roles.includes("Admin") : false;

  const [shiftState, setShiftState] = useState<ActiveShift>(idleShift);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

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

  const fetchShiftState = useCallback(async () => {
    if (!showShiftControls) return;
    try {
      const payload = await apiRequest<ShiftMePayload>("/api/shifts/me");
      setShiftState(payload.activeShift);
    } catch (error) {
      handleError(error, "تعذر تحميل حالة الشيفت");
      setShiftState(idleShift);
    }
  }, [handleError, showShiftControls]);

  useEffect(() => {
    if (!showShiftControls) {
      setShiftState(idleShift);
      return;
    }

    void fetchShiftState();
  }, [fetchShiftState, showShiftControls]);

  useEffect(() => {
    if (shiftState.status === "idle") return;
    const update = () => setTick(Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [shiftState.status]);

  const elapsedMs = useMemo(() => {
    if (shiftState.status === "idle" || !shiftState.startedAt) return 0;

    const startMs = new Date(shiftState.startedAt).getTime();
    const referenceTime =
      shiftState.status === "paused"
        ? new Date(shiftState.pauseStartedAt || tick).getTime()
        : tick;

    const pausedMs = shiftState.pauses.reduce((sum, pause) => {
      const pauseStart = new Date(pause.start).getTime();
      const pauseEnd = pause.end
        ? new Date(pause.end).getTime()
        : shiftState.status === "paused"
          ? referenceTime
          : tick;

      if (Number.isNaN(pauseStart) || Number.isNaN(pauseEnd) || pauseEnd <= pauseStart) {
        return sum;
      }

      return sum + (pauseEnd - pauseStart);
    }, 0);

    return Math.max(0, referenceTime - startMs - pausedMs);
  }, [shiftState, tick]);

  const callShiftAction = useCallback(
    async (path: string, successMessage: string) => {
      setShiftLoading(true);
      try {
        const payload = await apiRequest<{ activeShift: ActiveShift }>(path, {
          method: "POST",
          body: JSON.stringify({}),
        });
        setShiftState(payload.activeShift);
        pushToast(successMessage, "success");
      } catch (error) {
        handleError(error, "تعذر تنفيذ إجراء الشيفت");
      } finally {
        setShiftLoading(false);
      }
    },
    [handleError, pushToast]
  );

  const handleStartShift = () => {
    void callShiftAction("/api/shifts/me/start", "تم بدء الشيفت بنجاح");
  };

  const handlePauseShift = () => {
    void callShiftAction("/api/shifts/me/pause", "تم إيقاف الشيفت مؤقتًا");
  };

  const handleResumeShift = () => {
    void callShiftAction("/api/shifts/me/resume", "تم استئناف الشيفت");
  };

  const handleStopShift = () => {
    setStopConfirmOpen(true);
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          {!compact && (
            <button className="icon-btn menu-btn" onClick={onMenuToggle} type="button" aria-label="فتح القائمة">
              <i className="bx bx-menu"></i>
            </button>
          )}
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="topbar-actions">
          {showShiftControls && (
            <div className="shift-controls">
              <div className="shift-timer">
                <i className="bx bx-timer"></i>
                <span>{formatDuration(elapsedMs)}</span>
              </div>
              {shiftState.status === "idle" && (
                <button className="primary" type="button" onClick={handleStartShift} disabled={shiftLoading}>
                  بدء الشيفت
                </button>
              )}
              {shiftState.status === "running" && (
                <>
                  <button className="ghost" type="button" onClick={handlePauseShift} disabled={shiftLoading}>
                    إيقاف مؤقت
                  </button>
                  <button className="primary" type="button" onClick={handleStopShift} disabled={shiftLoading}>
                    إنهاء الشيفت
                  </button>
                </>
              )}
              {shiftState.status === "paused" && (
                <>
                  <button className="ghost" type="button" onClick={handleResumeShift} disabled={shiftLoading}>
                    استئناف
                  </button>
                  <button className="primary" type="button" onClick={handleStopShift} disabled={shiftLoading}>
                    إنهاء الشيفت
                  </button>
                </>
              )}
            </div>
          )}
          {!compact && <UserActions />}
        </div>
      </header>

      <ConfirmModal
        open={stopConfirmOpen}
        title="إنهاء الشيفت"
        message="هل تريد إنهاء الشيفت الحالي؟ سيتم تسجيل وقت الإيقاف في سجل الموظف."
        confirmLabel="إنهاء الشيفت"
        onClose={() => {
          setStopConfirmOpen(false);
          pushToast("تم إلغاء إنهاء الشيفت", "info");
        }}
        onConfirm={() => {
          setStopConfirmOpen(false);
          void callShiftAction("/api/shifts/me/stop", "تم إنهاء الشيفت");
        }}
      />
    </>
  );
}
