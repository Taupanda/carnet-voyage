// Les 12 étapes du voyage, avec dates et palettes de couleurs
export const STAGES = [
  { n: 1, nom: "Mexico City & Puebla", debut: "2026-09-08", fin: "2026-09-16", couleur: "#E8467C", accent: "#3B6FE0" },
  { n: 2, nom: "Bajío", debut: "2026-09-17", fin: "2026-09-21", couleur: "#F2703A", accent: "#F2C43A" },
  { n: 3, nom: "Train du Cuivre", debut: "2026-09-22", fin: "2026-09-26", couleur: "#C25B32", accent: "#E89B4C" },
  { n: 4, nom: "Basse Californie", debut: "2026-09-27", fin: "2026-10-09", couleur: "#2E7FA8", accent: "#E8A87C" },
  { n: 5, nom: "Transition vers Oaxaca", debut: "2026-10-10", fin: "2026-10-11", couleur: "#7A8FA6", accent: "#D9A566" },
  { n: 6, nom: "Côte Pacifique Oaxaca", debut: "2026-10-12", fin: "2026-10-22", couleur: "#1FA3A3", accent: "#FF7F5C" },
  { n: 7, nom: "Oaxaca ville & Día de los Muertos", debut: "2026-10-23", fin: "2026-11-03", couleur: "#7B3FA0", accent: "#FF8A2B" },
  { n: 8, nom: "Chiapas", debut: "2026-11-04", fin: "2026-11-11", couleur: "#2E7D4F", accent: "#D9B34A" },
  { n: 9, nom: "Yucatán élargi", debut: "2026-11-12", fin: "2026-11-25", couleur: "#17A2B8", accent: "#4CAF7D" },
  { n: 10, nom: "Belize", debut: "2026-11-26", fin: "2026-12-02", couleur: "#00A3C4", accent: "#5FD6D6" },
  { n: 11, nom: "Guatemala", debut: "2026-12-03", fin: "2026-12-12", couleur: "#3E8E5A", accent: "#C0392B" },
  { n: 12, nom: "Salvador", debut: "2026-12-13", fin: "2026-12-17", couleur: "#2E6DA4", accent: "#D4A24C" },
];

export function stageForDate(dateStr) {
  return STAGES.find((s) => dateStr >= s.debut && dateStr <= s.fin) || null;
}
