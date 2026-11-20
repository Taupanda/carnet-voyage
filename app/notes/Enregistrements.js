"use client";
import { useEffect, useState } from "react";
import { appelApi } from "../../lib/jeton";
import {
  listerEnregistrements, marquerTranscrit, oublierEnregistrement, transcrire, dureeLisible, trousLisibles,
} from "../../lib/enregistreur";

// Les enregistrements de la semaine, gardés sur le téléphone même une fois
// transcrits : on peut les réécouter, les retranscrire si un passage a sauté,
// copier le texte ou télécharger le son.
const quand = (ms) =>
  new Date(ms).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Le son enregistré par le navigateur (webm) n'annonce pas sa durée : le
// lecteur affiche une barre inutilisable. Sauter très loin la lui fait
// calculer, puis on revient au début.
function calerDuree(ev) {
  const a = ev.currentTarget;
  if (a.duration !== Infinity) return;
  a.addEventListener("timeupdate", function retour() {
    a.removeEventListener("timeupdate", retour);
    a.currentTime = 0;
  });
  a.currentTime = 1e101;
}

export default function Enregistrements() {
  const [liste, setListe] = useState(null);
  const [ouvert, setOuvert] = useState(null);

  async function charger() { setListe(await listerEnregistrements()); }
  useEffect(() => { charger(); }, []);

  if (!liste?.length) return null;
  return (
    <section className="enr-bloc">
      <h2 className="enr-titre">Derniers enregistrements <span>gardés 7 jours sur ce téléphone</span></h2>
      {liste.map((e) => (
        <Enregistrement key={e.id} e={e} ouvert={ouvert === e.id} basculer={() => setOuvert(ouvert === e.id ? null : e.id)} recharger={charger} />
      ))}
    </section>
  );
}

function Enregistrement({ e, ouvert, basculer, recharger }) {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // L'adresse du son n'est créée qu'à l'ouverture, et libérée à la fermeture.
  useEffect(() => {
    if (!ouvert) return;
    const u = URL.createObjectURL(e.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [ouvert, e.blob]);

  async function retranscrire() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await transcrire(e.blob, appelApi);
      await marquerTranscrit(e.id, r);
      setMsg(r.trous.length ? `Encore des passages sautés : ${trousLisibles(r.trous)}.` : "Retranscrit en entier.");
      await recharger();
    } catch (err) {
      setMsg(`Échec : ${err?.name === "AbortError" ? "délai dépassé" : err?.message || "erreur"}`);
    } finally {
      setBusy(false);
    }
  }

  async function copier() {
    try { await navigator.clipboard.writeText(e.texte); setMsg("Texte copié."); } catch { setMsg("Copie impossible."); }
  }

  async function supprimer() {
    if (!window.confirm("Supprimer cet enregistrement du téléphone ?")) return;
    await oublierEnregistrement(e.id);
    await recharger();
  }

  const ext = (e.blob.type || "").includes("mp4") ? "m4a" : "webm";
  return (
    <div className={"enr-ligne" + (ouvert ? " ouvert" : "")}>
      <button className="enr-tete" onClick={basculer} aria-expanded={ouvert}>
        <span>{quand(e.debut)}</span>
        <span className="enr-duree">{dureeLisible(e.secondes)}</span>
        {!e.transcrit && <span className="note-tag">pas transcrit</span>}
        {e.trous.length > 0 && <span className="note-tag alerte">passage sauté</span>}
      </button>
      {ouvert && (
        <div className="enr-corps">
          {url && <audio controls src={url} preload="metadata" style={{ width: "100%" }} onLoadedMetadata={calerDuree} />}
          {e.trous.length > 0 && <p className="enr-trous">Non transcrit : {trousLisibles(e.trous)}</p>}
          {e.texte && <p className="enr-texte">{e.texte}</p>}
          {e.brut && e.brut !== e.texte && (
            <details className="enr-brut">
              <summary>Avant relecture par Claude</summary>
              <p className="enr-texte">{e.brut}</p>
            </details>
          )}
          <div className="enr-actions">
            <button className="btn-secondary" onClick={retranscrire} disabled={busy}>{busy ? "…" : "↻ Retranscrire"}</button>
            {e.texte && <button className="btn-secondary" onClick={copier}>Copier le texte</button>}
            {url && <a className="btn-secondary" href={url} download={`enregistrement-${e.id}.${ext}`}>Télécharger</a>}
            <button className="cmt-del" onClick={supprimer} aria-label="Supprimer l'enregistrement">✕</button>
          </div>
          {msg && <p className="enr-msg">{msg}</p>}
        </div>
      )}
    </div>
  );
}
