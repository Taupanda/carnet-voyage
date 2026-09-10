"use client";
import { useRef } from "react";

// Deux chemins explicites au lieu d'un seul champ de fichier.
//
// Un `<input type="file" accept="image/*">` laisse le système décider quoi
// ouvrir, et selon l'appareil il tombe sur le gestionnaire de fichiers plutôt
// que sur les photos. En séparant les deux intentions, chaque bouton ouvre
// directement ce qu'il annonce : la galerie, ou l'appareil photo.
//
// `accept` liste aussi les extensions en clair : plusieurs sélecteurs de bureau
// filtrent les .heic de l'iPhone quand on se contente de `image/*`.
const FORMATS = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";

export default function PhotoPicker({ onFiles, busy = false, compact = false }) {
  const galerieRef = useRef(null);
  const appareilRef = useRef(null);

  const classe = compact ? "btn-secondary photo-btn-compact" : "btn-secondary photo-btn";

  return (
    <div className={compact ? "photo-choix compact" : "photo-choix"}>
      <button
        type="button"
        className={classe}
        onClick={() => galerieRef.current?.click()}
        disabled={busy}
        aria-label="Choisir dans la galerie"
      >
        🖼️{!compact && <span> Galerie</span>}
      </button>
      <button
        type="button"
        className={classe}
        onClick={() => appareilRef.current?.click()}
        disabled={busy}
        aria-label="Prendre une photo"
      >
        📷{!compact && <span> Photo</span>}
      </button>

      <input ref={galerieRef} type="file" accept={FORMATS} multiple hidden onChange={onFiles} />
      {/* capture ouvre directement l'appareil photo, sans passer par un choix */}
      <input ref={appareilRef} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
    </div>
  );
}
