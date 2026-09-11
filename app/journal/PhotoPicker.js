"use client";
import { useRef } from "react";

// Un bouton qui ouvre la galerie, et pas le gestionnaire de fichiers.
//
// Deux réglages décident de l'écran qu'Android ouvre, et il faut les deux :
//   - `accept` ne doit contenir QUE des types image. Une liste d'extensions
//     ajoutée à `image/*` (.heic, .jpg…) suffit à faire renoncer Chrome au
//     sélecteur de photos du système.
//   - `multiple` doit être absent. Sur Android, la sélection multiple n'est
//     proposée que par l'interface Documents : la demander, c'est demander
//     « Fichiers ». C'est ce qui restait ici, et ce qui ouvrait la mauvaise
//     fenêtre malgré un `accept` propre.
//
// Une photo à la fois, donc. Pour en envoyer plusieurs d'un coup, le chemin est
// inverse : on part de la galerie, on sélectionne, on partage vers l'app —
// `share_target` dans le manifeste, ramassé par le service worker.
//
// Le bouton appareil photo (`capture`) a disparu : les photos existent déjà
// dans la pellicule, personne n'en prend au moment d'écrire le post.
export default function PhotoPicker({ onFiles, busy = false, compact = false }) {
  const champRef = useRef(null);

  return (
    <div className={compact ? "photo-choix compact" : "photo-choix"}>
      <button
        type="button"
        className={compact ? "btn-secondary photo-btn-compact" : "btn-secondary photo-btn"}
        onClick={() => champRef.current?.click()}
        disabled={busy}
        aria-label="Ajouter une photo depuis la galerie"
      >
        🖼️{!compact && <span> Ajouter une photo</span>}
      </button>
      <input ref={champRef} type="file" accept="image/*" hidden onChange={onFiles} />
    </div>
  );
}
