"use client";
import { useEffect, useRef, useState } from "react";
import { appelApi } from "../lib/jeton";
import {
  creerEnregistreur, enregistrementPossible, enregistrementEnAttente, oublierEnregistrement,
  marquerTranscrit, purgerAnciens, transcrire, dureeLisible, trousLisibles, DUREE_MAX_S,
} from "../lib/enregistreur";

// Le bouton micro : un appui lance l'enregistrement, un second l'arrête, et
// le texte transcrit arrive dans le champ, à relire avant d'envoyer.
//
// onTexte(texte) reçoit la transcription ; onErreur(message | null) permet à
// la page d'afficher le problème là où elle affiche déjà les siens.
export default function Micro({ onTexte, onErreur, className = "", style }) {
  const [etat, setEtat] = useState("repos"); // repos | demarrage | ecoute | envoi
  const [secondes, setSecondes] = useState(0);
  const [attente, setAttente] = useState(null); // enregistrement sans texte
  const [dispo, setDispo] = useState(true);
  const recRef = useRef(null);
  const occupe = useRef(false); // démarrage en cours, sans attendre le rendu
  const vivant = useRef(true);

  useEffect(() => {
    vivant.current = true;
    setDispo(enregistrementPossible());
    purgerAnciens().then(enregistrementEnAttente).then((a) => vivant.current && setAttente(a));
    // Page quittée en plein enregistrement : on arrête, la copie de secours
    // garde le son pour la prochaine fois.
    return () => { vivant.current = false; recRef.current?.arreter(); };
  }, []);

  async function envoyer(enr) {
    setEtat("envoi");
    onErreur?.(null);
    try {
      const { texte, trous } = await transcrire(enr.blob, appelApi);
      // Le son reste une semaine sur le téléphone (calepin → Derniers
      // enregistrements), même transcrit : de quoi rattraper un passage sauté.
      await marquerTranscrit(enr.id, { texte, trous });
      if (!vivant.current) return;
      setAttente(null);
      if (texte) onTexte(texte);
      if (trous.length) {
        onErreur?.(`La transcription a sauté un passage (${trousLisibles(trous)}). Le son est gardé : réécoute-le ou retranscris-le depuis le calepin, rubrique « Derniers enregistrements ».`);
      } else if (!texte) {
        onErreur?.("Rien d'audible dans cet enregistrement.");
      }
    } catch (e) {
      if (!vivant.current) return;
      setAttente(enr);
      const raison = e?.name === "AbortError" ? "le serveur a mis trop de temps" : e?.message || "erreur inconnue";
      onErreur?.(`Transcription impossible — ${raison}. Le son est gardé sur le téléphone : touche ↻ pour réessayer.`);
    } finally {
      if (vivant.current) setEtat("repos");
    }
  }

  async function basculer() {
    // Pendant le démarrage (autorisation du micro, verrou d'écran), un second
    // appui lançait un second enregistrement par-dessus le premier.
    if (etat === "envoi" || etat === "demarrage" || occupe.current) return;
    if (etat === "ecoute") { recRef.current?.arreter(); return; }
    occupe.current = true;
    onErreur?.(null);
    const rec = creerEnregistreur({
      surTick: (s) => vivant.current && setSecondes(s),
      surEchecVeille: (raison) =>
        onErreur?.(`L'écran risque de s'éteindre (${raison}). Touche-le de temps en temps.`),
      surFin: (enr) => {
        recRef.current = null;
        if (!vivant.current) return;
        if (enr.motif === "duree") onErreur?.(`Enregistrement arrêté à ${DUREE_MAX_S / 60} minutes. Tu peux en relancer un.`);
        if (enr.motif === "coupure") onErreur?.("Le micro a été coupé par le téléphone — ce qui a été dit est transcrit.");
        envoyer(enr);
      },
    });
    setEtat("demarrage");
    try {
      await rec.demarrer();
      recRef.current = rec;
      setSecondes(0);
      setEtat("ecoute");
      occupe.current = false;
    } catch (e) {
      rec.annuler();
      setEtat("repos");
      occupe.current = false;
      const refus = e?.name === "NotAllowedError" || e?.name === "SecurityError";
      onErreur?.(refus
        ? "Micro refusé — autorise le micro pour ce site dans les réglages du navigateur."
        : `Micro indisponible (${e?.message || e?.name || "erreur"}).`);
    }
  }

  function annuler() {
    recRef.current?.annuler();
    recRef.current = null;
    setEtat("repos");
  }

  async function abandonner() {
    if (!attente) return;
    if (!window.confirm("Effacer l'enregistrement en attente ?")) return;
    await oublierEnregistrement(attente.id);
    setAttente(null);
    onErreur?.(null);
  }

  if (!dispo) return null;

  return (
    <>
      {etat === "repos" && attente && (
        <button
          type="button"
          className={`micro-btn micro-attente ${className}`}
          style={style}
          onClick={() => envoyer(attente)}
          onContextMenu={(e) => { e.preventDefault(); abandonner(); }}
          aria-label="Transcrire l'enregistrement en attente"
          title="Transcrire l'enregistrement en attente (appui long : l'effacer)"
        >
          ↻
        </button>
      )}
      <button
        type="button"
        className={`micro-btn ${className}${etat === "ecoute" ? " micro-on" : ""}`}
        style={style}
        onClick={basculer}
        disabled={etat === "envoi" || etat === "demarrage"}
        aria-pressed={etat === "ecoute"}
        aria-label={etat === "ecoute" ? "Arrêter et transcrire" : etat === "envoi" ? "Transcription en cours" : "Enregistrer"}
      >
        {etat === "ecoute" ? <span className="micro-duree">■ {dureeLisible(secondes)}</span> : etat === "envoi" ? <span className="spin">⏳</span> : "🎙️"}
      </button>
      {etat === "ecoute" && (
        <button type="button" className={`micro-btn micro-annuler ${className}`} style={style} onClick={annuler} aria-label="Annuler l'enregistrement">
          ✕
        </button>
      )}
    </>
  );
}
