"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "../lib/supabaseClient";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushButton({ role = "reader", label, labelDone }) {
  const [status, setStatus] = useState("idle"); // idle | subscribed | unsupported | working
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setStatus("subscribed");
      })
      .catch(() => setStatus("unsupported"));
  }, []);

  async function subscribe() {
    setStatus("working");
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Notifications refusées — tu peux les réactiver dans les réglages du navigateur.");
        setStatus("idle");
        return;
      }
      const keyRes = await fetch("/api/push");
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        setMsg("Clés de notification non configurées côté serveur.");
        setStatus("idle");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      let authHeaders = {};
      if (role === "admin") {
        const { data } = await supabaseBrowser().auth.getSession();
        const token = data.session?.access_token;
        if (token) authHeaders = { Authorization: `Bearer ${token}` };
      }
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ subscription: sub.toJSON(), role }),
      });
      if (!res.ok) throw new Error("enregistrement refusé");
      setStatus("subscribed");
      setMsg("Notifications activées.");
    } catch (e) {
      setMsg("Échec : " + e.message);
      setStatus("idle");
    }
  }

  if (status === "unsupported") return null;

  return (
    <div>
      <button
        className={status === "subscribed" ? "btn-secondary" : "btn"}
        onClick={subscribe}
        disabled={status === "subscribed" || status === "working"}
        style={{ fontSize: 13.5, padding: "10px 16px" }}
      >
        {status === "subscribed" ? labelDone || "Notifications activées ✓" : status === "working" ? "…" : label || "Activer les notifications"}
      </button>
      {msg && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{msg}</p>}
    </div>
  );
}
