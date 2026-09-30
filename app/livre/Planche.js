"use client";
import { useEffect, useState } from "react";
import { dispositionPlanche } from "../../lib/livre";

// La planche photo d'une journée : le format de chaque photo est lu une fois
// l'image chargée, puis les rangées sont calculées en millimètres.
export default function Planche({ photos, largeur, hauteur }) {
  const [ratios, setRatios] = useState(null);
  const cle = photos.join("|");

  useEffect(() => {
    let vivant = true;
    Promise.all(
      photos.map(
        (u) =>
          new Promise((ok) => {
            const img = new Image();
            img.onload = () => ok(img.naturalWidth / img.naturalHeight);
            img.onerror = () => ok(1.5);
            img.src = u;
          })
      )
    ).then((r) => vivant && setRatios(r));
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  const taille = { width: `${largeur}mm`, height: `${hauteur}mm` };
  if (!ratios) return <div className="planche" data-attente="" style={taille} />;

  const { rangs } = dispositionPlanche(ratios, { largeur, hauteur });
  return (
    <div className="planche" style={taille}>
      {rangs.map((g, k) => (
        <div key={k} className="planche-rang">
          {g.photos.map((p) => (
            <img key={p.index} src={photos[p.index]} alt="" style={{ width: `${p.largeur}mm`, height: `${g.hauteur}mm` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
