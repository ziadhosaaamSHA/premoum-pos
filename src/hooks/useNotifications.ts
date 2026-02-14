"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiRequest } from "@/lib/api";

export type NotificationItem = {
  id: string;
  type: "low_stock" | "warning" | "info";
  title: string;
  message: string;
  createdAt: string;
};

type NotifState = {
  viewedAt?: string;
  clearedAt?: string;
  dismissed?: Record<string, string>;
};

const DISMISS_LIMIT = 200;
const STORAGE_PREFIX = "premium_pos_notif_state_";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readNotifState(userId?: string): NotifState {
  if (!userId || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NotifState;
    return parsed || {};
  } catch {
    return {};
  }
}

function writeNotifState(userId: string | undefined, updates: NotifState) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(updates));
  } catch {
    // ignore storage failures
  }
}

type UseNotificationsOptions = {
  pollIntervalMs?: number;
  stream?: boolean;
};

export function useNotifications(options?: UseNotificationsOptions) {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const pollIntervalMs = options?.pollIntervalMs ?? 60_000;
  const useStream = options?.stream !== false;

  const [alerts, setAlerts] = useState<NotificationItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [viewedAt, setViewedAt] = useState<string | null>(null);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [dismissedMap, setDismissedMap] = useState<Record<string, string>>({});
  const [streamActive, setStreamActive] = useState(false);
  const streamRef = useRef<EventSource | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      if (!user) return;
      try {
        setAlertsLoading(true);
        const payload = await apiRequest<{ notifications: NotificationItem[] }>("/api/notifications", {
          cacheTtl: force ? 0 : 30_000,
          skipCache: force,
        });
        setAlerts(payload.notifications);
        setLastUpdatedAt(new Date().toISOString());
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message || "تعذر تحميل التنبيهات" : "تعذر تحميل التنبيهات";
        pushToast(message, "error");
      } finally {
        setAlertsLoading(false);
      }
    },
    [pushToast, user]
  );

  useEffect(() => {
    if (!user) return;
    const state = readNotifState(user.id);
    setViewedAt(state.viewedAt ?? null);
    setClearedAt(state.clearedAt ?? null);
    setDismissedMap(state.dismissed ?? {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    writeNotifState(user.id, {
      viewedAt: viewedAt ?? undefined,
      clearedAt: clearedAt ?? undefined,
      dismissed: Object.keys(dismissedMap).length ? dismissedMap : undefined,
    });
  }, [user, viewedAt, clearedAt, dismissedMap]);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [refresh, user]);

  useEffect(() => {
    if (!user) return;
    if (!useStream || typeof window === "undefined" || typeof EventSource === "undefined") {
      setStreamActive(false);
      return;
    }

    const source = new EventSource("/api/notifications/stream");
    streamRef.current = source;
    setStreamActive(true);

    source.addEventListener("update", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data || "{}") as {
          notifications?: NotificationItem[];
          ts?: string;
        };
        if (Array.isArray(data.notifications)) {
          setAlerts(data.notifications);
          setLastUpdatedAt(data.ts || new Date().toISOString());
          setAlertsLoading(false);
        }
      } catch {
        // ignore parse errors
      }
    });

    source.addEventListener("error", () => {
      setStreamActive(false);
      source.close();
      streamRef.current = null;
    });

    return () => {
      source.close();
      streamRef.current = null;
      setStreamActive(false);
    };
  }, [useStream, user]);

  useEffect(() => {
    if (!user) return;
    if (streamActive) return;
    const interval = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);
    return () => window.clearInterval(interval);
  }, [pollIntervalMs, refresh, streamActive, user]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const handler = () => {
      void refresh(true);
    };
    window.addEventListener("notifications:refresh", handler);
    return () => window.removeEventListener("notifications:refresh", handler);
  }, [refresh, user]);

  const visibleAlerts = useMemo(() => {
    const clearedTime = clearedAt ? new Date(clearedAt).getTime() : 0;
    return alerts.filter((alert) => {
      const dismissedAt = dismissedMap[alert.id];
      if (dismissedAt) {
        const dismissedTime = new Date(dismissedAt).getTime();
        const createdTime = new Date(alert.createdAt).getTime();
        if (createdTime <= dismissedTime) return false;
      }
      return new Date(alert.createdAt).getTime() > clearedTime;
    });
  }, [alerts, clearedAt, dismissedMap]);

  const unreadCount = useMemo(() => {
    const viewedTime = viewedAt ? new Date(viewedAt).getTime() : 0;
    return visibleAlerts.filter((alert) => new Date(alert.createdAt).getTime() > viewedTime).length;
  }, [visibleAlerts, viewedAt]);

  const markAllViewed = useCallback(() => {
    if (!visibleAlerts.length) return;
    const latest = visibleAlerts.reduce((max, alert) => {
      const time = new Date(alert.createdAt).getTime();
      return Math.max(max, time);
    }, 0);
    const next = new Date(latest || Date.now()).toISOString();
    setViewedAt(next);
    pushToast("تم تعليم التنبيهات كمقروءة", "success");
  }, [pushToast, visibleAlerts]);

  const clearAll = useCallback(() => {
    const now = new Date().toISOString();
    setClearedAt(now);
    setViewedAt(now);
    pushToast("تم مسح جميع التنبيهات", "info");
  }, [pushToast]);

  const dismiss = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setDismissedMap((prev) => {
        const next = { ...prev, [id]: now };
        const entries = Object.entries(next).sort(
          (a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime()
        );
        return Object.fromEntries(entries.slice(0, DISMISS_LIMIT));
      });
    },
    [setDismissedMap]
  );

  return {
    alerts,
    visibleAlerts,
    alertsLoading,
    lastUpdatedAt,
    unreadCount,
    viewedAt,
    clearedAt,
    dismissedIds: Object.keys(dismissedMap),
    refresh,
    markAllViewed,
    clearAll,
    dismiss,
  };
}
