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

// Deux canaux, deux interrupteurs, et chacun dit exactement ce qu'il fait.
//
// Un seul bouton mélangeait les deux : cocher « newsletter » à l'inscription
// n'envoyait aucun e-mail — il n'y en avait pas — et n'influait même pas sur les
// notifications, qui partaient à tous les navigateurs abonnés. La notification
// appartient à l'APPAREIL (il faut l'accord de ce navigateur-ci), l'e-mail
// appartient au COMPTE : les confondre est ce qui rendait le réglage incompréhensible.
export default function Abonnement() {
  const { user, profile, refresh } = useAuth();
  const [parEmail, setParEmail] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
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

  useEffect(() => { setParEmail(!!profile?.recap_email); }, [profile]);

  // Le choix fait à l'inscription n'était rangé que dans les métadonnées du
  // compte : il n'allumait rien. On l'applique à la première visite, une seule
  // fois — ensuite c'est l'interrupteur qui commande.
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.recap_email === false && user.user_metadata?.newsletter && !profile.recap_vu) {
      basculeEmail(true, { silencieux: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  async function basculeEmail(valeur, { silencieux = false } = {}) {
    if (!user) return;
    setBusyEmail(true);
    // recap_vu : la préférence a été décidée ici, il ne faut plus la reprendre
    // des métadonnées d'inscription à chaque chargement.
    await supabaseBrowser().from("profiles").upsert({ id: user.id, recap_email: valeur, recap_vu: true });
    setParEmail(valeur);
    await refresh();
    setBusyEmail(false);
    if (!silencieux) {
      setErreur(false);
      setMsg(valeur ? "Tu recevras le récap par e-mail." : "Plus d'e-mail. Les notifications, elles, ne changent pas.");
    }
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
      setActif(true);
      setMsg("Cet appareil recevra la notification du récap.");
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
      setActif(false);
      setMsg("Plus de notification sur cet appareil.");
    } catch (e) {
      setErreur(true);
      setMsg("Échec : " + e.message);
    }
    setBusy(false);
  }

  return (
    <div className="abo">
      <p className="abo-titre">Ce que tu reçois</p>
      <p className="abo-desc">
        Un récap de la semaine, une fois par semaine. Rien d'autre : pas de
        message à chaque publication. Les deux canaux sont indépendants, tu peux
        n'en prendre aucun, l'un, ou les deux.
      </p>

      <div className="abo-canal">
        <div className="abo-canal-txt">
          <p className="abo-canal-titre">🔔 Notification sur cet appareil</p>
          <p className="abo-canal-desc">
            Une alerte du téléphone ou du navigateur. Ce réglage ne vaut que pour
            <b> cet appareil-ci</b> : sur un autre téléphone, il faudra le refaire.
          </p>
        </div>
        <span className={"abo-etat" + (actif ? " on" : "")}>{actif ? "Activée" : "Non"}</span>
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
          {busy ? "…" : actif ? "Couper les notifications ici" : "Activer sur cet appareil"}
        </button>
      )}

      <div className="abo-canal" style={{ marginTop: 18 }}>
        <div className="abo-canal-txt">
          <p className="abo-canal-titre">✉️ Récap par e-mail</p>
          <p className="abo-canal-desc">
            Le récap de la semaine dans ta boîte{user?.email ? <> — à <b>{user.email}</b></> : null}.
            Ce réglage suit <b>ton compte</b>, sur tous tes appareils.
          </p>
        </div>
        <span className={"abo-etat" + (parEmail ? " on" : "")}>{parEmail ? "Abonné" : "Non"}</span>
      </div>
      <button
        className={parEmail ? "btn-secondary" : "btn"}
        style={{ width: "100%" }}
        onClick={() => basculeEmail(!parEmail)}
        disabled={busyEmail || !user}
      >
        {busyEmail ? "…" : parEmail ? "Ne plus recevoir d'e-mail" : "Recevoir le récap par e-mail"}
      </button>

      {msg && <p className={erreur ? "error" : "info"} style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
