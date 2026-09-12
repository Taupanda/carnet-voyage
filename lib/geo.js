// Distance entre deux points du globe, en kilomètres.
//
// Formule de haversine : c'est une distance À VOL D'OISEAU. Elle sert à
// proposer un ordre de grandeur quand l'auteur n'a pas noté ses kilomètres
// lui-même, jamais à l'affirmer — une route réelle est toujours plus longue,
// souvent d'un quart. Ce qui est publié reste ce qu'il a validé.
const RAYON_TERRE_KM = 6371;

const enRadians = (d) => (d * Math.PI) / 180;

export function distanceKm(a, b) {
  if (!a || !b) return null;
  const [lat1, lng1, lat2, lng2] = [a.lat, a.lng, b.lat, b.lng].map(Number);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lng1) > 180 || Math.abs(lng2) > 180) return null;

  const dLat = enRadians(lat2 - lat1);
  const dLng = enRadians(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(enRadians(lat1)) * Math.cos(enRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Arrondi utile : au kilomètre près au-delà de 10 km, au dixième en deçà —
// personne n'a besoin de trois décimales sur un trajet de bus.
export function arrondiKm(km) {
  if (!Number.isFinite(km) || km < 0) return null;
  return km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
}

export function formateKm(km) {
  // Une distance absente n'est pas une distance nulle : sans ce garde,
  // Number(null) vaut 0 et le post afficherait « 0 km » là où il ne doit
  // rien afficher du tout.
  if (km === null || km === undefined || km === "") return null;
  const v = arrondiKm(Number(km));
  if (v === null) return null;
  return `${v.toLocaleString("fr-FR")} km`;
}

// ---- Kilomètres de la journée : à pied d'un côté, trajets de l'autre ----
//
// Une journée type enchaîne plusieurs modes — taxi jusqu'à la gare routière,
// bus de nuit, puis colectivo. Les trajets sont donc une liste, pas un champ.
// « Autre » existe pour tout ce qui n'entre pas dans les cinq : colectivo,
// moto-taxi, stop.
export const MODES = [
  { id: "bus", label: "Bus", ic: "🚌" },
  { id: "train", label: "Train", ic: "🚆" },
  { id: "avion", label: "Avion", ic: "✈️" },
  { id: "bateau", label: "Bateau", ic: "⛴️" },
  { id: "taxi", label: "Taxi", ic: "🚕" },
  { id: "autre", label: "Autre", ic: "🛺" },
];

export const modeInfo = (id) => MODES.find((m) => m.id === id) || MODES[MODES.length - 1];

// Ce qui vient de la base peut être n'importe quoi : colonne absente, ancien
// format, saisie partielle. On ne garde que des trajets exploitables.
export function normaliseTrajets(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) => {
      const km = Number(t?.km);
      if (!Number.isFinite(km) || km <= 0) return null;
      const mode = MODES.some((m) => m.id === t?.mode) ? t.mode : "autre";
      return { mode, km };
    })
    .filter(Boolean);
}

// Les totaux d'une journée. `km` est l'ancienne colonne, d'avant la
// distinction : elle sert de repli pour les posts déjà écrits, qu'on ne veut
// pas voir perdre leur distance.
export function totauxKm(e) {
  const trajets = normaliseTrajets(e?.trajets);
  const transport = trajets.reduce((s, t) => s + t.km, 0);
  const marcheBrut = Number(e?.km_marche);
  const marche = Number.isFinite(marcheBrut) && marcheBrut > 0 ? marcheBrut : 0;

  if (!trajets.length && !marche) {
    const ancien = Number(e?.km);
    if (Number.isFinite(ancien) && ancien > 0) {
      return { marche: 0, transport: 0, total: ancien, trajets: [], ancien: true };
    }
    return { marche: 0, transport: 0, total: 0, trajets: [], ancien: false };
  }
  return { marche, transport, total: marche + transport, trajets, ancien: false };
}

// Cumul sur tout le voyage, par nature de déplacement.
//
// Un total unique n'avait pas de sens : marcher quinze kilomètres et en faire
// mille en avion ne sont pas la même quantité, et les additionner produit un
// nombre que personne ne peut interpréter. On garde donc les catégories
// séparées, et le total en dernier, à titre indicatif.
//
// Les journées d'avant la distinction n'ont qu'un total sans mode : les
// attribuer à un transport serait une invention, alors elles sont comptées à
// part et annoncées comme telles.
export function cumulKm(entrees) {
  const parMode = new Map();
  let marche = 0;
  let nonDetaille = 0;

  for (const e of entrees || []) {
    const t = totauxKm(e);
    if (t.ancien) { nonDetaille += t.total; continue; }
    marche += t.marche;
    for (const tr of t.trajets) parMode.set(tr.mode, (parMode.get(tr.mode) || 0) + tr.km);
  }

  const transports = [...parMode.entries()]
    .map(([mode, km]) => ({ mode, km, ...modeInfo(mode) }))
    .sort((a, b) => b.km - a.km); // le plus parcouru en tête

  const transport = transports.reduce((s, t) => s + t.km, 0);
  return { marche, transports, transport, nonDetaille, total: marche + transport + nonDetaille };
}
