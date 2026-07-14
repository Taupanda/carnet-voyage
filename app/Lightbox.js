"use client";
import { useEffect, useCallback } from "react";

export default function Lightbox({ photos, index, onClose, onMove, caption }) {
  const move = useCallback(
    (d) => {
      const next = (index + d + photos.length) % photos.length;
      onMove(next);
    },
    [index, photos.length, onMove]
  );

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [move, onClose]);

  if (index === null || index === undefined) return null;

  return (
    <div className="lb" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lb-close" onClick={onClose} aria-label="Fermer">✕</button>
      {photos.length > 1 && (
        <>
          <button className="lb-prev" onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label="Précédente">‹</button>
          <button className="lb-next" onClick={(e) => { e.stopPropagation(); move(1); }} aria-label="Suivante">›</button>
        </>
      )}
      <img src={photos[index]} alt="" onClick={(e) => e.stopPropagation()} />
      <div className="lb-cap">
        {caption ? caption + " · " : ""}{index + 1} / {photos.length}
      </div>
    </div>
  );
}
