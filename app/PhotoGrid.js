"use client";
import { useState } from "react";
import Lightbox from "./Lightbox";

export default function PhotoGrid({ photos, caption }) {
  const [open, setOpen] = useState(null);
  if (!photos?.length) return null;

  const n = photos.length;
  const cls = n === 1 ? "n1" : n === 2 ? "n2" : n === 3 ? "n3" : "nmany";
  const shown = n > 4 ? photos.slice(0, 4) : photos;
  const hidden = n - shown.length;

  return (
    <>
      <div className={`post-photos ${cls}`}>
        {shown.map((url, i) => (
          <div key={i} className="photo-cell" onClick={() => setOpen(i)}>
            <img src={url} alt="" loading="lazy" />
            {i === shown.length - 1 && hidden > 0 && (
              <div className="photo-more">+{hidden}</div>
            )}
          </div>
        ))}
      </div>
      {open !== null && (
        <Lightbox photos={photos} index={open} onMove={setOpen} onClose={() => setOpen(null)} caption={caption} />
      )}
    </>
  );
}
