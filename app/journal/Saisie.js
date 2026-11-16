"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// La zone de saisie de l'entretien.
//
// Un champ d'une ligne, coincé entre trois boutons, laissait voir une
// vingtaine de caractères : impossible de relire ou de corriger une longue
// transcription. Le texte prend désormais toute la largeur, la zone grandit
// avec lui (jusqu'à la moitié de l'écran, puis elle défile), et un bouton
// l'ouvre en grand pour les très longs passages.
//
// Sa hauteur ne dépend que du texte, jamais du focus : une zone qui se
// replierait en perdant le focus déplacerait le bouton d'envoi sous le doigt
// au moment précis où on le touche.
export default function Saisie({ value, onChange, onSend, disabled, placeholder, outils }) {
  const ref = useRef(null);
  const [plein, setPlein] = useState(false);
  const [deborde, setDeborde] = useState(false);
  const [tactile, setTactile] = useState(true);

  useEffect(() => {
    setTactile(window.matchMedia?.("(pointer: coarse)")?.matches ?? true);
  }, []);

  // Hauteur ajustée au contenu à chaque frappe (et à chaque transcription).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (plein) { el.style.height = ""; return; } // la feuille de style prend la main
    el.style.height = "auto";
    const max = window.innerHeight * 0.45;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    setDeborde(el.scrollHeight > max + 2 || value.length > 400);
  }, [value, plein]);

  // Vidée après l'envoi : on sort du mode plein écran.
  useEffect(() => { if (!value) setPlein(false); }, [value]);

  function envoyer() {
    setPlein(false);
    onSend();
  }

  return (
    <div className={"saisie" + (plein ? " plein" : "")}>
      <textarea
        ref={ref}
        className="input saisie-texte"
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Au clavier d'ordinateur, Entrée envoie (Maj+Entrée va à la ligne).
          // Sur téléphone, Entrée va à la ligne : on envoie avec ➤.
          if (e.key === "Enter" && !e.shiftKey && !tactile) {
            e.preventDefault();
            envoyer();
          }
        }}
        placeholder={placeholder}
      />
      <div className="saisie-outils">
        {outils}
        <span style={{ flex: 1 }} />
        {(deborde || plein) && (
          <button
            type="button"
            className="btn-secondary saisie-agrandir"
            onClick={() => { setPlein((p) => !p); ref.current?.focus(); }}
            aria-label={plein ? "Réduire la zone de texte" : "Agrandir la zone de texte"}
          >
            {plein ? "⤡ Réduire" : "⤢ Agrandir"}
          </button>
        )}
        <button className="btn saisie-envoyer" onClick={envoyer} disabled={disabled} aria-label="Envoyer">➤</button>
      </div>
    </div>
  );
}
