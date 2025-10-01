'use client';

import { useEffect } from "react";

const SW_PATH = "/sw.js";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_PATH);
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.info("FlowLedger PWA update ready. Reload to apply.");
            }
          };
        };
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    register();
  }, []);

  return null;
}
