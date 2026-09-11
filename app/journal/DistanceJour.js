"use client";
import { MODES } from "../../lib/geo";

// La distance de la journée : ce qui a été marché, et les trajets faits.
//
// Le même bloc sert à la saisie du soir et à la reprise d'un post déjà écrit —
// une seule définition, donc aucun risque que les deux écrans divergent.
export default function DistanceJour({ marche, setMarche, trajets, setTrajets, estimation }) {
  const nombre = (v) => v.replace(/[^0-9.,]/g, "");

  const majTrajet = (i, champ, valeur) =>
    setTrajets(trajets.map((t, j) => (j === i ? { ...t, [champ]: valeur } : t)));
  const ajouter = (km = "") => setTrajets([...trajets, { mode: "bus", km }]);
  const retirer = (i) => setTrajets(trajets.filter((_, j) => j !== i));

  return (
    <div>
      <label className="lbl">🚶 Kilomètres à pied</label>
      <div className="km-ligne">
        <input
          className="input km-champ"
          type="text"
          inputMode="decimal"
          value={marche}
          onChange={(e) => setMarche(nombre(e.target.value))}
          placeholder="0"
        />
        <span className="km-unite">km</span>
      </div>

      <label className="lbl" style={{ marginTop: 16 }}>🚌 Trajets de la journée</label>
      {trajets.length === 0 && <p className="km-vide">Aucun trajet — journée sur place.</p>}
      {trajets.map((t, i) => (
        <div key={i} className="km-trajet">
          <select
            className="input km-mode"
            value={t.mode}
            onChange={(e) => majTrajet(i, "mode", e.target.value)}
            aria-label="Mode de transport"
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>{m.ic} {m.label}</option>
            ))}
          </select>
          <input
            className="input km-champ"
            type="text"
            inputMode="decimal"
            value={t.km}
            onChange={(e) => majTrajet(i, "km", nombre(e.target.value))}
            placeholder="0"
            aria-label="Distance en kilomètres"
          />
          <span className="km-unite">km</span>
          <button type="button" className="km-retirer" onClick={() => retirer(i)} aria-label="Retirer ce trajet">✕</button>
        </div>
      ))}

      <div className="km-actions">
        <button type="button" className="btn-secondary km-ajout" onClick={() => ajouter()}>+ Un trajet</button>
        {/* L'estimation ne choisit pas le mode à sa place : elle ne connaît que
            la distance entre deux points, pas la façon dont il l'a franchie. */}
        {estimation > 0 && (
          <button type="button" className="btn-secondary km-ajout" onClick={() => ajouter(String(estimation))}>
            ≈ {estimation} km depuis la veille
          </button>
        )}
      </div>
    </div>
  );
}
