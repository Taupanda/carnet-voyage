"use client";

export default function PrintButton() {
  return (
    <button className="btn" onClick={() => window.print()}>
      🖨️ Imprimer / Enregistrer en PDF
    </button>
  );
}
