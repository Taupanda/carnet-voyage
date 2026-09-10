// Catalogue unique des outils : la bande des derniers utilisés sur l'accueil et
// la page Outils y puisent la même icône et le même libellé.
//
// L'ordre n'est ni alphabétique ni thématique : c'est celui de la fréquence
// réelle d'usage, du geste de tous les jours à ce qui ne sert qu'une fois. Les
// six premiers servent aussi de garniture à la bande d'accès rapide tant que
// l'historique est court.
export const OUTILS = [
  // tous les jours
  { href: "/notes", label: "Calepin", ic: "📝" },
  { href: "/convertisseur", label: "Change", ic: "💱" },
  { href: "/budget", label: "Budget", ic: "💰" },
  { href: "/workout", label: "Workout", ic: "💪" },
  // le soir, autour du journal
  { href: "/journal", label: "Raconter", ic: "✏️" },
  { href: "/rencontres", label: "Rencontres", ic: "🤝" },
  { href: "/vocabulaire", label: "Vocabulaire", ic: "🗣️" },
  // préparer la suite
  { href: "/planning", label: "Planning", ic: "🗓️" },
  { href: "/itineraire", label: "Itinéraire", ic: "🧭" },
  { href: "/reservations", label: "Réservations", ic: "🏨" },
  { href: "/coffre", label: "Coffre", ic: "🔐" },
  // ce qui arrive de l'extérieur, une fois de temps en temps
  { href: "/resumes", label: "Résumés", ic: "📮" },
  { href: "/moderation", label: "Modération", ic: "🛡️" },
  { href: "/livre-d-or", label: "Livre d'or", ic: "💛" },
  { href: "/recos", label: "Conseils", ic: "💡" },
  // rarement, ou plus du tout
  { href: "/album", label: "Album", ic: "🖼️" },
  { href: "/", label: "Le blog", ic: "📖" },
  { href: "/livre", label: "Le livre", ic: "📕" },
  { href: "/checklist", label: "Check-list", ic: "✅" },
];

const CLE = "carnet-derniers-outils";
const MAX = 8;

export function noterVisite(href) {
  const outil = OUTILS.find((o) => o.href === href);
  if (!outil) return;
  try {
    const avant = JSON.parse(localStorage.getItem(CLE) || "[]");
    const apres = [href, ...avant.filter((h) => h !== href)].slice(0, MAX);
    localStorage.setItem(CLE, JSON.stringify(apres));
  } catch {}
}

// Les derniers ouverts, complétés par les plus courants tant que l'historique
// est court : la bande n'est jamais vide, même au premier lancement.
export function derniersOutils(n = 6) {
  let recents = [];
  try {
    recents = JSON.parse(localStorage.getItem(CLE) || "[]");
  } catch {}
  const ordre = [...recents, ...OUTILS.map((o) => o.href)];
  const vus = new Set();
  const sortie = [];
  for (const href of ordre) {
    if (vus.has(href)) continue;
    vus.add(href);
    const o = OUTILS.find((x) => x.href === href);
    if (o) sortie.push(o);
    if (sortie.length === n) break;
  }
  return sortie;
}
