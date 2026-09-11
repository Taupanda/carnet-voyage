"use client";
import { useRef } from "react";

// Un seul bouton, qui ouvre le sélecteur de photos du téléphone.
//
// Il y en avait deux — « Galerie » et « Photo » — parce qu'un `<input>` unique
// tombait parfois sur le gestionnaire de fichiers au lieu des images. Le vrai
// coupable n'était pas le nombre de boutons mais la liste d'extensions ajoutée
// à `accept` : dès qu'`image/*` est mélangé à des .heic/.jpg/.png explicites,
// Chrome sur Android renonce au sélecteur de photos du système et ouvre
// « Fichiers ». Avec `image/*` seul, il ouvre l'écran de sélection de photos,
// où l'on voit ses vignettes — c'est le seul chemin utile ici.
//
// Le bouton appareil photo (`capture`) a disparu avec : les photos existent
// déjà dans la pellicule, personne n'en prend au moment d'écrire le post. Le
// sélecteur du système propose de toute façon l'appareil photo si besoin.
export default function PhotoPicker({ onFiles, busy = false, compact = false }) {
  const champRef = useRef(null);

  return (
    <div className={compact ? "photo-choix compact" : "photo-choix"}>
      <button
        type="button"
        className={compact ? "btn-secondary photo-btn-compact" : "btn-secondary photo-btn"}
        onClick={() => champRef.current?.click()}
        disabled={busy}
        aria-label="Ajouter des photos"
      >
        🖼️{!compact && <span> Ajouter des photos</span>}
      </button>
      <input ref={champRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
    </div>
  );
}
