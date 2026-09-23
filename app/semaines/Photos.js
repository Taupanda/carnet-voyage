"use client";
import { useState } from "react";
import Lightbox from "../Lightbox";

// La bande de photos d'un chapitre, qui s'ouvre dans la visionneuse.
export function PhotosChapitre({ photos, caption }) {
  const [open, setOpen] = useState(null);
  if (!photos?.length) return null;
  return (
    <>
      <div className={"recap-photos n" + Math.min(photos.length, 3)}>
        {photos.map((u, i) => (
          <img key={u} src={u} alt="" loading="lazy" onClick={() => setOpen(i)} />
        ))}
      </div>
      {open !== null && <Lightbox photos={photos} index={open} onMove={setOpen} onClose={() => setOpen(null)} caption={caption} />}
    </>
  );
}

// Toutes les photos de la semaine, derrière un bouton : les chapitres n'en
// montrent qu'une sélection.
export function ToutesLesPhotos({ photos, caption }) {
  const [open, setOpen] = useState(null);
  if (!photos?.length) return null;
  return (
    <>
      <button type="button" className="recap-toutes" onClick={() => setOpen(0)}>
        📷 Les {photos.length} photo{photos.length > 1 ? "s" : ""} de la semaine
      </button>
      {open !== null && <Lightbox photos={photos} index={open} onMove={setOpen} onClose={() => setOpen(null)} caption={caption} />}
    </>
  );
}
