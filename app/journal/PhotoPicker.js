"use client";
import { useRef } from "react";

// Le bouton ouvre le sélecteur qu'Android veut bien ouvrir, et sur certains
// téléphones — Samsung One UI notamment — la Galerie n'y figure pas du tout :
// le menu « Sélectionner une action » ne propose qu'Appareil photo, Mes
// fichiers et Fichiers. Chrome passe par ACTION_GET_CONTENT, pas par le
// sélecteur de photos du système, et aucun attribut HTML ne change cela.
// `accept` limité aux images et `multiple` retiré ont été essayés : même menu.
// `multiple` est donc rétabli — l'enlever ne rapportait rien et coûtait la
// sélection multiple dans « Mes fichiers ».
//
// Le vrai chemin vers la galerie est l'inverse : on part de la Galerie, on
// sélectionne, on partage vers l'app (`share_target` du manifeste, ramassé par
// le service worker). C'est ce que rappelle la ligne sous le bouton.
//
// Le bouton appareil photo (`capture`) reste supprimé : les photos existent
// déjà dans la pellicule, personne n'en prend au moment d'écrire le post.
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

// Le chemin qui marche quand le sélecteur d'Android n'offre pas la galerie.
export function AstucePartage() {
  return (
    <p className="photo-astuce">
      Plusieurs photos d'un coup : ouvre ta <b>Galerie</b>, sélectionne-les,
      puis <b>Partager</b> → <b>Les aventures de Maxou</b>.
    </p>
  );
}
