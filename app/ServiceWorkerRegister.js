"use client";
import { useEffect } from "react";

// Enregistre le service worker sur toutes les pages (pour le cache offline),
// pas seulement là où PushButton est monté.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
