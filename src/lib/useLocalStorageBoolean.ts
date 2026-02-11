"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_EVENT = "local-storage";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(STORAGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STORAGE_EVENT, handler);
  };
}

function getSnapshot(key: string, defaultValue: boolean) {
  if (typeof window === "undefined") return defaultValue;
  const value = window.localStorage.getItem(key);
  if (value === null) return defaultValue;
  return value === "1" || value === "true";
}

export default function useLocalStorageBoolean(key: string, defaultValue = false) {
  const value = useSyncExternalStore(
    subscribe,
    () => getSnapshot(key, defaultValue),
    () => defaultValue
  );

  const setValue = useCallback(
    (next: boolean) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, next ? "1" : "0");
      window.dispatchEvent(new Event(STORAGE_EVENT));
    },
    [key]
  );

  return [value, setValue] as const;
}
