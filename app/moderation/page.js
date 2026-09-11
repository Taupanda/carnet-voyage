"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";

async function api(path, opts = {}) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

async function motifEchec(res) {
  if (res.status === 401) return "session admin non reconnue, reconnecte-toi";
  const detail = await res.json().catch(() => null);
  return detail?.error || `erreur ${res.status}`;
}

const quand = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

const nomDe = (p) => [p?.prenom, p?.nom].filter(Boolean).join(" ") || "Compte sans nom";

function Avatar({ p, taille = 34 }) {
  return p?.avatar_url ? (
    <img src={p.avatar_url} alt="" className="avatar" style={{ width: taille, height: taille }} />
  ) : (
    <span className="avatar avatar-fallback" style={{ width: taille, height: taille, fontSize: taille * 0.4 }}>
      {(p?.prenom || "?")[0]?.toUpperCase()}
    </span>
  );
}

export default function Moderation() {
  return (
    <AdminGate>
      <ModerationBody />
    </AdminGate>
  );
}

function ModerationBody() {
  const [data, setData] = useState(null);
  const [onglet, setOnglet] = useState("membres");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [recherche, setRecherche] = useState("");

  async function load() {
    const res = await api("/api/moderation");
    if (!res.ok) { setErr("Chargement impossible : " + (await motifEchec(res))); setData({ membres: [], commentaires: [], messages: [], recos: [] }); return; }
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function agir(opts, confirmation) {
    if (confirmation && !confirm(confirmation)) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/moderation", opts);
    setBusy(false);
    if (!res.ok) { setErr("Action refusée : " + (await motifEchec(res))); return false; }
    await load();
    return true;
  }

  const filtre = recherche.trim().toLowerCase();
  const colle = (...champs) => !filtre || champs.filter(Boolean).join(" ").toLowerCase().includes(filtre);

  const membres = useMemo(
    () => (data?.membres || []).filter((m) => colle(m.prenom, m.nom, m.email)),
    [data, filtre]
  );
  const commentaires = useMemo(
    () => (data?.commentaires || []).filter((c) => colle(c.contenu, nomDe(c.auteur))),
    [data, filtre]
  );
  const messages = useMemo(
    () => (data?.messages || []).filter((m) => colle(m.contenu, nomDe(m.auteur))),
    [data, filtre]
  );
  const recos = useMemo(
    () => (data?.recos || []).filter((r) => colle(r.titre, r.description, nomDe(r.auteur))),
    [data, filtre]
  );

  const ONGLETS = [
    { id: "membres", label: "Membres", n: data?.membres?.length },
    { id: "commentaires", label: "Commentaires", n: data?.commentaires?.length },
    { id: "messages", label: "Livre d'or", n: data?.messages?.length },
    { id: "recos", label: "Conseils", n: data?.recos?.length },
  ];

  const bloques = (data?.membres || []).filter((m) => m.bloque).length;

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 820 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", margin: "10px 0 4px" }}>Modération</h1>
      <p style={{ color: "var(--ink2)", marginBottom: 18 }}>
        Qui écrit sur le carnet, et ce qui s'y publie.
        {bloques > 0 && <> <b>{bloques} compte{bloques > 1 ? "s" : ""} bloqué{bloques > 1 ? "s" : ""}.</b></>}
      </p>

      <div className="filters">
        {ONGLETS.map((o) => (
          <button key={o.id} className={"filter" + (onglet === o.id ? " on" : "")} onClick={() => setOnglet(o.id)}>
            {o.label}{o.n != null && ` (${o.n})`}
          </button>
        ))}
      </div>

      <input
        className="input"
        style={{ marginBottom: 16 }}
        placeholder="Rechercher un nom, un e-mail, un texte…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {err && <p className="error" style={{ marginBottom: 14 }}>{err}</p>}
      {data && data.comptesLisibles === false && (
        <p className="mod-avis">
          Les e-mails et dates d'inscription n'ont pas pu être lus. Les profils et les contenus
          restent affichés et modérables.
        </p>
      )}

      {!data ? (
        <p className="empty">Chargement…</p>
      ) : onglet === "membres" ? (
        membres.length === 0 ? <p className="empty">Aucun membre.</p> : membres.map((m) => (
          <div key={m.id} className={"mod-membre" + (m.bloque ? " bloque" : "")}>
            <Avatar p={m} taille={40} />
            <div className="mod-membre-corps">
              <div className="mod-membre-nom">
                {nomDe(m)}
                {m.bloque && <span className="mod-tag bloque">bloqué</span>}
                {m.newsletter && <span className="mod-tag">récap</span>}
              </div>
              <div className="mod-meta">
                {m.email || "e-mail non lisible"}
                {m.fournisseur && ` · ${m.fournisseur}`}
                {m.inscrit_le && ` · inscrit le ${quand(m.inscrit_le)}`}
              </div>
              <div className="mod-meta">
                {m.nb_commentaires} commentaire{m.nb_commentaires > 1 ? "s" : ""} ·{" "}
                {m.nb_messages} mot{m.nb_messages > 1 ? "s" : ""} ·{" "}
                {m.nb_recos} conseil{m.nb_recos > 1 ? "s" : ""}
              </div>
            </div>
            <div className="mod-actions">
              <button
                className="btn-secondary mod-btn"
                disabled={busy}
                onClick={() => agir(
                  { method: "PATCH", body: JSON.stringify({ action: "bloquer", id: m.id, valeur: !m.bloque }) },
                  m.bloque ? null : `Bloquer ${nomDe(m)} ? Ses écrits restent en ligne, mais il ne pourra plus rien publier.`
                )}
              >
                {m.bloque ? "Débloquer" : "Bloquer"}
              </button>
              <button
                className="btn-secondary mod-btn"
                disabled={busy || (m.nb_commentaires + m.nb_messages + m.nb_recos) === 0}
                onClick={() => agir(
                  { method: "DELETE", body: JSON.stringify({ type: "contenus", id: m.id }) },
                  `Supprimer tout ce que ${nomDe(m)} a écrit ? Le compte est conservé.`
                )}
              >
                Vider
              </button>
              <button
                className="btn-danger mod-btn"
                disabled={busy}
                onClick={() => agir(
                  { method: "DELETE", body: JSON.stringify({ type: "compte", id: m.id }) },
                  `Supprimer définitivement le compte de ${nomDe(m)} et tout ce qu'il a écrit ? Cette action est irréversible.`
                )}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))
      ) : onglet === "commentaires" ? (
        commentaires.length === 0 ? <p className="empty">Aucun commentaire.</p> : commentaires.map((c) => (
          <div key={c.id} className="mod-contenu">
            <Avatar p={c.auteur} />
            <div className="mod-contenu-corps">
              <div className="mod-meta">
                <b>{nomDe(c.auteur)}</b> · sur la journée du {quand(c.entry_date)} · {quand(c.created_at)}
              </div>
              <p className="mod-texte">{c.contenu}</p>
            </div>
            <button className="cmt-del" disabled={busy}
              onClick={() => agir({ method: "DELETE", body: JSON.stringify({ type: "commentaire", id: c.id }) }, "Supprimer ce commentaire ?")}>✕</button>
          </div>
        ))
      ) : onglet === "messages" ? (
        messages.length === 0 ? <p className="empty">Aucun mot.</p> : messages.map((m) => (
          <div key={m.id} className="mod-contenu">
            <Avatar p={m.auteur} />
            <div className="mod-contenu-corps">
              <div className="mod-meta">
                <b>{nomDe(m.auteur)}</b> · {quand(m.created_at)}
                <span className={"mod-tag" + (m.public ? " public" : "")}>{m.public ? "public" : "privé"}</span>
              </div>
              <p className="mod-texte">{m.contenu}</p>
            </div>
            <div className="mod-actions">
              <button className="btn-secondary mod-btn" disabled={busy}
                onClick={() => agir({ method: "PATCH", body: JSON.stringify({ action: "publier", id: m.id, valeur: !m.public }) },
                  m.public ? "Retirer ce mot du livre d'or public ?" : "Rendre ce mot visible de tous ?")}>
                {m.public ? "Rendre privé" : "Publier"}
              </button>
              <button className="cmt-del" disabled={busy}
                onClick={() => agir({ method: "DELETE", body: JSON.stringify({ type: "message", id: m.id }) }, "Supprimer ce mot ?")}>✕</button>
            </div>
          </div>
        ))
      ) : (
        recos.length === 0 ? <p className="empty">Aucun conseil.</p> : recos.map((r) => (
          <div key={r.id} className="mod-contenu">
            <Avatar p={r.auteur} />
            <div className="mod-contenu-corps">
              <div className="mod-meta">
                <b>{nomDe(r.auteur)}</b> · {r.categorie} · {quand(r.created_at)}
              </div>
              <p className="mod-texte"><b>{r.titre}</b>{r.description && ` — ${r.description}`}</p>
            </div>
            <button className="cmt-del" disabled={busy}
              onClick={() => agir({ method: "DELETE", body: JSON.stringify({ type: "reco", id: r.id }) }, "Supprimer ce conseil ?")}>✕</button>
          </div>
        ))
      )}

      <MenagePhotos />
    </main>
  );
}

/* ---------- Photos orphelines ----------
   Un post abandonné avant d'être enregistré laisse ses photos dans le stockage,
   rattachées à rien. On recense d'abord, on supprime seulement après. */
function MenagePhotos() {
  const [etat, setEtat] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [fait, setFait] = useState(null);

  const mo = (o) => (o / 1048576).toFixed(1).replace(".", ",");

  async function recenser() {
    setBusy(true); setErr(null); setFait(null);
    try {
      const res = await api("/api/photos-orphelines");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `erreur ${res.status}`);
      setEtat(await res.json());
    } catch (e) { setErr("Recensement impossible : " + e.message); }
    setBusy(false);
  }

  async function supprimer() {
    if (!confirm(`Supprimer définitivement ${etat.orphelines.length} photo(s) ?`)) return;
    setBusy(true); setErr(null);
    try {
      const res = await api("/api/photos-orphelines", { method: "POST", body: JSON.stringify({ confirmer: true }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `erreur ${res.status}`);
      const r = await res.json();
      setFait(`${r.supprimees} photo(s) supprimée(s), ${mo(r.octets)} Mo libérés.`);
      setEtat(null);
    } catch (e) { setErr("Suppression impossible : " + e.message); }
    setBusy(false);
  }

  return (
    <section className="mod-menage">
      <h2>Photos orphelines</h2>
      <p>
        Les photos envoyées puis jamais rattachées à une journée restent dans le
        stockage. Celles de moins de 24 h sont laissées de côté : un post en
        cours d'écriture n'est pas encore enregistré.
      </p>
      {err && <p className="error" style={{ marginBottom: 10 }}>{err}</p>}
      {fait && <p className="mod-menage-ok">{fait}</p>}
      {etat && (
        <p className="mod-menage-ok">
          {etat.total} photo(s) dans le stockage, {etat.utilisees} rattachée(s).
          {" "}
          {etat.orphelines.length === 0
            ? "Aucune orpheline à supprimer."
            : `${etat.orphelines.length} orpheline(s), ${mo(etat.octets)} Mo.`}
          {etat.recentesEpargnees > 0 && ` ${etat.recentesEpargnees} récente(s) épargnée(s).`}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-secondary" onClick={recenser} disabled={busy}>
          {busy ? "…" : "Recenser"}
        </button>
        {etat && etat.orphelines.length > 0 && (
          <button className="btn" onClick={supprimer} disabled={busy}>
            Supprimer les {etat.orphelines.length} orphelines
          </button>
        )}
      </div>
    </section>
  );
}
