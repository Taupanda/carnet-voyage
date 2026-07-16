"use client";
import { useState } from "react";
import Lightbox from "./Lightbox";

export default function PhotoGridV2({ photos, principale, caption }) {
  const [open, setOpen] = useState(null);
  if (!photos?.length) return null;

  // photo principale en tête, les autres derrière
  const ordered = principale && photos.includes(principale)
    ? [principale, ...photos.filter((p) => p !== principale)]
    : photos;

  const hero = ordered[0];
  const rest = ordered.slice(1);

  return (
    <>
      <img className="photo-hero" src={hero} alt="" loading="lazy" onClick={() => setOpen(0)} />
      {rest.length > 0 && (
        <div className="photo-secondaires">
          {rest.map((url, i) => (
            <img key={i} src={url} alt="" loading="lazy" onClick={() => setOpen(i + 1)} />
          ))}
        </div>
      )}
      {open !== null && (
        <Lightbox photos={ordered} index={open} onMove={setOpen} onClose={() => setOpen(null)} caption={caption} />
      )}
    </>
  );
}
