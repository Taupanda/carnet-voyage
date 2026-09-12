"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { todayLocal } from "../../lib/stages";
import { appelApi } from "../../lib/jeton";

// Le jeton vient du cache d'AuthProvider : plus de getSession() par requête,
// et un délai maximal, pour qu'un appel finisse toujours — réponse ou erreur.
const api = appelApi;

// Le jour courant suit le fuseau du voyage, pas celui du navigateur ni UTC.
const todayStr = () => todayLocal();
const fmtWeek = (d) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export default function Resumes() {
  return (
    <AdminGate>
      <ResumesBody />
    </AdminGate>
  );
}

function ResumesBody() {
  const [list, setList] = useState([]);
  const [week, setWeek] = useState(todayStr());
  const [current, setCurrent] = useState(null); // brouillon/résumé en cours d'édition
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [onglet, setOnglet] = useState("resumes");
  const [abonnes, setAbonnes] = useState(null);

  async function load() {
    const res = await api("/api/weekly-recap");
    if (res.ok) setList(await res.json());
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  // Chargé à l'ouverture de l'onglet, et rechargé à chaque fois : entre deux
  // visites, quelqu'un a pu s'abonner ou se désabonner.
  useEffect(() => {
    if (onglet !== "abonnes") return;
    setAbonnes(null);
    api("/api/abonnes")
      .then(async (r) => setAbonnes(r.ok ? await r.json() : { erreur: (await r.json().catch(() => ({}))).error || `erreur ${r.status}` }))
      .catch((e) => setAbonnes({ erreur: e.message }));
  }, [onglet]);

  async function generate() {
    setBusy(true);
    setErr(null);
    const res = await api("/api/weekly-recap", { method: "POST", body: JSON.stringify({ action: "generate", semaine: week }) });
    setBusy(false);
    if (res.ok) { setCurrent(await res.json()); load(); }
    else setErr(((await res.json()).error) || "Échec de la génération.");
  }

  async function save(status) {
    if (!current) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/weekly-recap", {
      method: "POST",
      body: JSON.stringify({ id: current.id, semaine_debut: current.semaine_debut, titre: current.titre, contenu: current.contenu, status }),
    });
    setBusy(false);
    if (res.ok) { setCurrent(await res.json()); load(); }
    else setErr(((await res.json()).error) || "Échec.");
  }

  // Les canaux sont choisis à chaque envoi : les abonnés ne sont pas les mêmes
  // d'un canal à l'autre, et renvoyer sur les deux « pour être sûr » enverrait
  // deux fois à ceux qui ont choisi l'un des deux.
  async function sendRecap(canaux) {
    if (!current?.id) return;
    const quoi = canaux.length === 2 ? "en notification ET par e-mail"
      : canaux[0] === "email" ? "par e-mail" : "en notification";
    if (!confirm(`Envoyer ce récap ${quoi} aux abonnés concernés ?`)) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/weekly-recap", { method: "POST", body: JSON.stringify({ action: "send", id: current.id, canaux }) });
    setBusy(false);
    if (res.ok) {
      const r = await res.json();
      setCurrent((c) => (c ? { ...c, status: "published" } : c));
      load();
      // Le détail par canal, y compris ce qui n'est pas parti et pourquoi : un
      // « envoyé ! » qui cache un canal muet ne rend service à personne.
      const bilan = [];
      if (r.push) bilan.push(r.push.raison ? `Notifications : ${r.push.raison}` : `Notifications : ${r.push.envoyes} envoyée(s)${r.push.echecs ? `, ${r.push.echecs} échec(s)` : ""}`);
      if (r.email) bilan.push(r.email.raison ? `E-mails : ${r.email.raison}` : `E-mails : ${r.email.envoyes} envoyé(s)${r.email.echecs ? `, ${r.email.echecs} échec(s)` : ""}`);
      alert(bilan.join("\n") || "Rien à envoyer.");
    } else {
      setErr(((await res.json()).error) || "Échec de l'envoi.");
    }
  }

  async function del(id) {
    if (!confirm("Supprimer ce résumé ?")) return;
    await api("/api/weekly-recap", { method: "DELETE", body: JSON.stringify({ id }) });
    if (current?.id === id) setCurrent(null);
    setList((l) => l.filter((r) => r.id !== id));
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 640 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", margin: "10px 0 6px" }}>Résumés hebdo</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
        L'IA rédige un brouillon à partir de tes posts publiés. Tu valides avant publication.
      </p>

      <div className="filters" style={{ marginBottom: 18 }}>
        <button className={"filter" + (onglet === "resumes" ? " on" : "")} onClick={() => setOnglet("resumes")}>Résumés</button>
        <button className={"filter" + (onglet === "abonnes" ? " on" : "")} onClick={() => setOnglet("abonnes")}>
          Abonnés{abonnes?.parEmail ? ` (${abonnes.parEmail.length})` : ""}
        </button>
      </div>

      {onglet === "abonnes" ? <Abonnes data={abonnes} /> : <>

      <div className="budget-card" style={{ marginBottom: 16 }}>
        <label className="lbl">Semaine à résumer (n'importe quel jour)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="input" type="date" value={week} onChange={(e) => setWeek(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <button className="btn" onClick={generate} disabled={busy}>{busy ? "…" : "✨ Générer"}</button>
        </div>
        {err && <p className="error" style={{ marginTop: 10 }}>{err}</p>}
      </div>

      {current && (
        <div className="budget-card budget-add" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span className="aside-head" style={{ margin: 0, color: "var(--accent)" }}>Semaine du {fmtWeek(current.semaine_debut)}</span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: current.status === "published" ? "var(--olive)" : "var(--muted)" }}>
              {current.status === "published" ? "● publié" : "○ brouillon"}
            </span>
          </div>
          <input className="input serif" style={{ fontSize: 17, marginBottom: 8 }} value={current.titre || ""} onChange={(e) => setCurrent({ ...current, titre: e.target.value })} placeholder="Titre" />
          <textarea className="input" rows={8} value={current.contenu || ""} onChange={(e) => setCurrent({ ...current, contenu: e.target.value })} style={{ lineHeight: 1.6 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn-secondary" onClick={() => save("draft")} disabled={busy}>Enregistrer le brouillon</button>
            <button className="btn-secondary" onClick={() => sendRecap(["push"])} disabled={busy || !current.id}>🔔 Notifier</button>
            <button className="btn-secondary" onClick={() => sendRecap(["email"])} disabled={busy || !current.id}>✉️ Par e-mail</button>
            <button className="btn" onClick={() => sendRecap(["push", "email"])} disabled={busy || !current.id}>📨 Les deux</button>
            <button className="btn-danger" onClick={() => del(current.id)} style={{ marginLeft: "auto" }}>Supprimer</button>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>L'envoi publie aussi le récap (accessible via le lien de la notification).</p>
        </div>
      )}

      <div className="aside-head" style={{ marginBottom: 10 }}>Tous les résumés</div>
      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="empty">Aucun résumé pour l'instant.</p>
      ) : (
        list.map((r) => (
          <div key={r.id} className="depense-row" style={{ cursor: "pointer" }} onClick={() => { setCurrent(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <span style={{ fontSize: 16 }}>{r.status === "published" ? "📮" : "📝"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.titre || "Sans titre"}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Semaine du {fmtWeek(r.semaine_debut)} · {r.status === "published" ? "publié" : "brouillon"}</div>
            </div>
          </div>
        ))
      )}
      </>}
    </main>
  );
}

/* ---------- Qui recevra le prochain récap ---------- */
function Abonnes({ data }) {
  if (!data) return <p className="empty">Chargement…</p>;
  if (data.erreur) return <p className="error">Liste indisponible : {data.erreur}</p>;

  const joignables = data.parEmail.filter((a) => a.joignable);
  const copier = () => {
    const txt = joignables.map((a) => a.email).join(", ");
    navigator.clipboard?.writeText(txt).then(
      () => alert(`${joignables.length} adresse(s) copiée(s).`),
      () => alert(txt)
    );
  };

  return (
    <>
      <div className="budget-card" style={{ marginBottom: 16 }}>
        <div className="aside-head" style={{ marginBottom: 8 }}>✉️ Récap par e-mail — {joignables.length}</div>
        {!data.emailConfigure && (
          <p className="mod-avis" style={{ marginBottom: 10 }}>
            L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY, EMAIL_FROM) :
            ces personnes sont abonnées mais rien ne partira.
          </p>
        )}
        {!data.adressesLisibles && (
          <p className="mod-avis" style={{ marginBottom: 10 }}>
            Les adresses ne sont pas lisibles depuis ici — les noms sortent, pas les e-mails.
          </p>
        )}
        {data.parEmail.length === 0 ? (
          <p className="empty" style={{ margin: 0 }}>Personne pour l'instant.</p>
        ) : (
          <>
            {data.parEmail.map((a) => (
              <div key={a.id} className="abonne-ligne">
                <span className="abonne-nom">{a.nom}</span>
                <span className="abonne-mail">{a.email || "adresse non lisible"}</span>
                {/* Abonné mais injoignable : l'adresse manque ou n'est pas
                    valide. Le dire ici évite de croire à un envoi qui n'aura
                    pas lieu. */}
                {!a.joignable && <span className="mod-tag bloque">injoignable</span>}
              </div>
            ))}
            {joignables.length > 0 && (
              <button className="btn-secondary" style={{ marginTop: 12 }} onClick={copier}>
                Copier les {joignables.length} adresse(s)
              </button>
            )}
          </>
        )}
      </div>

      <div className="budget-card">
        <div className="aside-head" style={{ marginBottom: 8 }}>🔔 Notification — {data.push.total}</div>
        {data.push.total === 0 ? (
          <p className="empty" style={{ margin: 0 }}>Aucun appareil abonné.</p>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
              Ce sont des <b>appareils</b>, pas des personnes : quelqu'un qui a
              activé les notifications sur son téléphone et son ordinateur compte deux fois.
            </p>
            {data.push.noms.length > 0 && <p style={{ fontSize: 13, margin: "0 0 6px" }}>{data.push.noms.join(" · ")}</p>}
            {data.push.sansCompte > 0 && (
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
                Et {data.push.sansCompte} appareil(s) sans compte — des visiteurs non connectés.
              </p>
            )}
          </>
        )}
        {data.push.bloquesEcartes > 0 && (
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
            {data.push.bloquesEcartes} appareil(s) écarté(s) : compte bloqué.
          </p>
        )}
      </div>
    </>
  );
}
