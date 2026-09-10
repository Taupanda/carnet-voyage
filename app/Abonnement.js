"use client";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "../lib/supabaseClient";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Suivre le voyage = recevoir le récap de la semaine. Un seul interrupteur, qui
// fait réellement les deux choses nécessaires : demander l'autorisation au
// navigateur, et enregistrer l'abonnement. Avant, le bouton de notifications et
// l'idée de « suivre » n'étaient reliés nulle part et rien ne disait ce qu'on
// recevait en s'abonnant.
export default function Abonnement() {
  const { user, profile, refresh } = useAuth();
  const [actif, setActif] = useState(false);
  const [supporte, setSupporte] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupporte(false);
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setActif(!!sub))
      .catch(() => setSupporte(false));
  }, []);

  // La case du profil et l'abonnement réel du navigateur peuvent diverger : on
  // affiche l'état du navigateur, seul état qui décide vraiment de la réception.
  useEffect(() => {
    if (profile?.newsletter && !actif) setMsg(null);
  }, [profile, actif]);

  async function noteLePreference(valeur) {
    if (!user) return;
    await supabaseBrowser().from("profiles").upsert({ id: user.id, newsletter: valeur });
    await refresh();
  }

  async function activer() {
    setBusy(true);
    setMsg(null);
    setErreur(false);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setErreur(true);
        setMsg("Ton navigateur a refusé les notifications. Tu peux les réautoriser dans ses réglages, pour ce site.");
        setBusy(false);
        return;
      }
      const { publicKey } = await (await fetch("/api/push")).json();
      if (!publicKey) throw new Error("les notifications ne sont pas configurées sur le serveur");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), role: "reader" }),
      });
      if (!res.ok) throw new Error("enregistrement refusé");
      await noteLePreference(true);
      setActif(true);
      setMsg("C'est bon — tu recevras le récap chaque semaine.");
    } catch (e) {
      setErreur(true);
      setMsg("Échec : " + e.message);
    }
    setBusy(false);
  }

  async function desactiver() {
    setBusy(true);
    setMsg(null);
    setErreur(false);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      await noteLePreference(false);
      setActif(false);
      setMsg("Désabonné. Tu peux revenir quand tu veux.");
    } catch (e) {
      setErreur(true);
      setMsg("Échec : " + e.message);
    }
    setBusy(false);
  }

  return (
    <div className="abo">
      <div className="abo-head">
        <div>
          <p className="abo-titre">Suivre le voyage</p>
          <p className="abo-desc">
            Un récap de la semaine, une fois par semaine. Rien d'autre : pas de notification
            à chaque publication, pas d'e-mail.
          </p>
        </div>
        <span className={"abo-etat" + (actif ? " on" : "")}>{actif ? "Abonné" : "Non abonné"}</span>
      </div>

      {!supporte ? (
        <p className="abo-msg">
          Ce navigateur ne gère pas les notifications. Sur iPhone, ajoute d'abord le site
          à ton écran d'accueil, puis reviens ici.
        </p>
      ) : (
        <button
          className={actif ? "btn-secondary" : "btn"}
          style={{ width: "100%" }}
          onClick={actif ? desactiver : activer}
          disabled={busy}
        >
          {busy ? "…" : actif ? "Me désabonner" : "Recevoir le récap de la semaine"}
        </button>
      )}

      {msg && <p className={erreur ? "error" : "info"} style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
