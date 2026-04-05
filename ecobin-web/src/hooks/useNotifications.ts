"use client";

/**
 * useNotifications — Custom hook for browser & in-app notifications.
 *
 * How it works:
 *  1. On mount, requests browser Notification permission
 *  2. Receives the latest unreadAlerts from the polling hook
 *  3. Compares with previous alerts to detect NEWLY arrived alerts
 *  4. For each new bin_full alert:
 *     - Fires browser Notification (if permission granted)
 *     - Returns toast data so the UI can display a floating toast
 *  5. Clears toast after auto-dismiss
 *
 * Usage:
 *  const { toastAlert, dismissToast, permission } = useNotifications({ unreadAlerts });
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Alert } from "@/lib/types";

interface UseNotificationsProps {
  unreadAlerts: Alert[];
}

interface UseNotificationsReturn {
  /** The current alert to show in the floating toast (null if none) */
  toastAlert: Alert | null;
  /** Call this to manually dismiss the toast */
  dismissToast: () => void;
  /** Current browser Notification permission state */
  permission: NotificationPermission | "unsupported";
  /** Call this to re-request permission (only works after a user gesture) */
  requestPermission: () => Promise<void>;
}

export function useNotifications({
  unreadAlerts,
}: UseNotificationsProps): UseNotificationsReturn {
  const [toastAlert, setToastAlert] = useState<Alert | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission | "unsupported">("default");

  // Track which alert IDs we've already shown to avoid re-triggering on re-render
  const shownAlertIds = useRef<Set<string>>(new Set());

  // ── Permission handling ──
  // Check current permission on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (err) {
      console.warn("[useNotifications] Permission request failed:", err);
    }
  }, []);

  // ── Detect new alerts ──
  // When unreadAlerts changes, find any alerts we haven't shown yet
  useEffect(() => {
    if (!unreadAlerts || unreadAlerts.length === 0) return;

    for (const alert of unreadAlerts) {
      // Skip already-shown alerts and non-bin_full alerts
      if (shownAlertIds.current.has(alert.id)) continue;
      if (alert.alert_type !== "bin_full") continue;

      // Mark as shown to prevent duplicates
      shownAlertIds.current.add(alert.id);

      // Show the floating toast
      setToastAlert(alert);

      // Fire browser notification if permitted
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const sectorLabel =
          alert.sector_type.charAt(0).toUpperCase() +
          alert.sector_type.slice(1);
        try {
          new Notification("🚨 EcoBin Alert", {
            body: `${sectorLabel} bin is full — please empty it!`,
            icon: "/favicon.ico",
            tag: alert.id, // Prevents duplicate browser notifications
            requireInteraction: false,
          });
        } catch (err) {
          console.warn("[useNotifications] Browser notification failed:", err);
        }
      }

      // Only show one toast at a time — the first new bin_full alert wins
      break;
    }
  }, [unreadAlerts]);

  const dismissToast = useCallback(() => {
    setToastAlert(null);
  }, []);

  return { toastAlert, dismissToast, permission, requestPermission };
}
