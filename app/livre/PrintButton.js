"use client";
import { useEffect, useState } from "react";

// L'impression attend la fin de la mise en page : lancée trop tôt, elle
// partirait avec des planches vides et des textes pas encore ajustés.
export default function PrintButton() {
  const [pret, setPret] = useState(false);
  useEffect(() => {
    if (window.__livrePret) setPret(true);
    const ok = () => setPret(true);
    window.addEventListener("livre-pret", ok);
    return () => window.removeEventListener("livre-pret", ok);
  }, []);
  return (
    <button className="btn" onClick={() => window.print()} disabled={!pret}>
      {pret ? "🖨️ Imprimer / Enregistrer en PDF" : "Mise en page…"}
    </button>
  );
}
