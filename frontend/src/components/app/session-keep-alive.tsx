"use client";

import { useEffect, useRef } from "react";

import { ACCESS_TOKEN_MAX_AGE_SECONDS } from "@/lib/auth/cookies";

/** Refresh once this much of the token lifetime has elapsed since the last refresh. */
const REFRESH_AFTER_MS = (ACCESS_TOKEN_MAX_AGE_SECONDS * 1000) / 3;
/** How often to check whether a refresh is due. */
const CHECK_INTERVAL_MS = 60_000;
/** A tab with no interaction for this long is considered idle and lets the session lapse. */
const IDLE_AFTER_MS = 5 * 60_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * Keeps an active user signed in. The access token is short-lived; instead of
 * bouncing someone to the login page mid-task, re-issue the cookie while they
 * are still interacting with the app. Hidden or idle tabs do not refresh.
 */
export function SessionKeepAlive() {
  const lastActivity = useRef(0);
  const lastRefresh = useRef(0);

  useEffect(() => {
    lastActivity.current = Date.now();
    lastRefresh.current = Date.now();
    const markActivity = () => {
      lastActivity.current = Date.now();
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActivity, { passive: true });
    }

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (document.hidden) return;
      if (now - lastActivity.current > IDLE_AFTER_MS) return;
      if (now - lastRefresh.current < REFRESH_AFTER_MS) return;
      lastRefresh.current = now;
      void fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      }).catch(() => {
        // A failed refresh just means the next request redirects to login.
      });
    }, CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActivity);
      }
    };
  }, []);

  return null;
}
