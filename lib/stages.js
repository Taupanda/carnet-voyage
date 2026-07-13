// Les 12 étapes du voyage : dates et couleurs
export const STAGES = [
  { n: 1,  nom: "Mexico City & Puebla",    debut: "2026-09-08", fin: "2026-09-16", couleur: "#FF3D7F" },
  { n: 2,  nom: "Bajío",                   debut: "2026-09-17", fin: "2026-09-21", couleur: "#FF8A3D" },
  { n: 3,  nom: "Train du Cuivre",         debut: "2026-09-22", fin: "2026-09-26", couleur: "#E2563C" },
  { n: 4,  nom: "Basse Californie",        debut: "2026-09-27", fin: "2026-10-09", couleur: "#2FA8E0" },
  { n: 5,  nom: "Vers Oaxaca",             debut: "2026-10-10", fin: "2026-10-11", couleur: "#9AA7B8" },
  { n: 6,  nom: "Côte Pacifique",          debut: "2026-10-12", fin: "2026-10-22", couleur: "#18C6BC" },
  { n: 7,  nom: "Oaxaca & Día de Muertos", debut: "2026-10-23", fin: "2026-11-03", couleur: "#A855F7" },
  { n: 8,  nom: "Chiapas",                 debut: "2026-11-04", fin: "2026-11-11", couleur: "#3FBF6F" },
  { n: 9,  nom: "Yucatán",                 debut: "2026-11-12", fin: "2026-11-25", couleur: "#22C1D6" },
  { n: 10, nom: "Belize",                  debut: "2026-11-26", fin: "2026-12-02", couleur: "#0FD0C0" },
  { n: 11, nom: "Guatemala",               debut: "2026-12-03", fin: "2026-12-12", couleur: "#5FBF4A" },
  { n: 12, nom: "Salvador",                debut: "2026-12-13", fin: "2026-12-17", couleur: "#F2B33D" },
];

export const TRIP_START = STAGES[0].debut;
export const TRIP_END = STAGES[STAGES.length - 1].fin;

export const TRIP_DAYS =
  Math.round((new Date(TRIP_END) - new Date(TRIP_START)) / 86400000) + 1;

export function stageForDate(dateStr) {
  return STAGES.find((s) => dateStr >= s.debut && dateStr <= s.fin) || null;
}

export function stageDays(s) {
  return Math.round((new Date(s.fin) - new Date(s.debut)) / 86400000) + 1;
}

export function dayNumberOf(dateStr) {
  return Math.round((new Date(dateStr) - new Date(TRIP_START)) / 86400000) + 1;
}

export function todayLocal() {
  // Mexique ≈ UTC-6
  return new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
}

export function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
