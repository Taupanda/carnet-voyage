// Calculs du livre imprimé : disposition des planches photo et chiffres du
// voyage. Tout est en millimètres, les dimensions de la page A4 elle-même : la
// mise en page ne dépend ni de l'écran ni du zoom.
import { cumulKm, arrondiKm } from "./geo.js";
import { photosDuJour } from "./recap.js";

export const PHOTOS_PAR_PLANCHE = 12;

// Rangées justifiées : dans une rangée, toutes les photos ont la même hauteur
// et chacune la largeur que lui donne son format — rien n'est recadré, portrait
// et paysage cohabitent. On essaie toutes les façons de couper la suite en
// rangées (l'ordre est gardé, la photo principale en tête) et on garde celle
// qui remplit le mieux la planche.
//
// `ratios` : largeur / hauteur de chaque photo.
export function dispositionPlanche(ratios, { largeur, hauteur, ecart = 2.5, minLargeur = 22, minHauteur = 32, maxRangs = 5 } = {}) {
  const n = ratios.length;
  if (!n) return { rangs: [], hauteur: 0 };
  const r = ratios.map((x) => (Number.isFinite(x) && x > 0 ? x : 1.5));
  let meilleur = null;

  for (let masque = 0; masque < 1 << (n - 1); masque++) {
    // un bit à 1 : la photo suivante ouvre une nouvelle rangée
    const rangs = [[0]];
    for (let i = 1; i < n; i++) {
      if (masque & (1 << (i - 1))) rangs.push([i]);
      else rangs[rangs.length - 1].push(i);
    }
    if (rangs.length > maxRangs) continue;

    // hauteur naturelle de chaque rangée pour occuper toute la largeur
    const h = rangs.map((g) => (largeur - ecart * (g.length - 1)) / g.reduce((s, i) => s + r[i], 0));
    const dispo = hauteur - ecart * (rangs.length - 1);
    const echelle = Math.min(1, dispo / h.reduce((a, b) => a + b, 0));
    const hs = h.map((x) => x * echelle);

    // Une vignette trop étroite ou une rangée trop basse ne se regardent plus ;
    // la photo principale ne doit plus dévorer la planche (au plus la moitié,
    // dès trois photos).
    const tropPetite = rangs.some((g, k) => hs[k] < minHauteur || g.some((i) => r[i] * hs[k] < minLargeur));
    const tropGrande = n >= 3 && hs[0] > hauteur / 2;
    const aire = rangs.reduce((t, g, k) => t + hs[k] * hs[k] * g.reduce((s, i) => s + r[i], 0), 0);
    const principale = hs[0] * hs[0] * r[0];
    const score = aire + 0.25 * principale - (tropPetite ? 1e7 : 0) - (tropGrande ? 1e6 : 0);
    if (!meilleur || score > meilleur.score) meilleur = { score, rangs, hs };
  }

  const rangs = meilleur.rangs.map((g, k) => ({
    hauteur: meilleur.hs[k],
    photos: g.map((i) => ({ index: i, largeur: r[i] * meilleur.hs[k] })),
  }));
  return { rangs, hauteur: rangs.reduce((s, g) => s + g.hauteur, 0) + ecart * (rangs.length - 1) };
}

const NOTES = ["note_humeur", "note_energie", "note_sociale", "note_aventure"];

// Moyenne de chaque ressenti sur les jours où il a été noté.
export function moyennesNotes(posts) {
  const out = {};
  for (const k of NOTES) {
    const v = (posts || []).map((p) => Number(p[k])).filter((x) => Number.isFinite(x) && x > 0);
    out[k] = v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  }
  return out;
}

// Les grands chiffres du voyage, pour la double page d'ouverture. Pas de total
// de kilomètres tous modes confondus : il ne voudrait rien dire.
export function chiffresLivre(posts, { etapes = [], rencontres = 0, joursVoyage = 0 } = {}) {
  const liste = posts || [];
  const nombre = (n) => Number(n).toLocaleString("fr-FR");
  const km = cumulKm(liste);
  const etapesVues = new Set(
    liste.map((p) => etapes.find((s) => p.date >= s.debut && p.date <= s.fin)?.n).filter(Boolean)
  ).size;
  const tuiles = [
    { n: nombre(liste.length), l: joursVoyage ? `jours racontés sur ${joursVoyage}` : "jours racontés" },
    { n: nombre(etapesVues), l: `étape${etapesVues > 1 ? "s" : ""} sur ${etapes.length}` },
    { n: nombre(new Set(liste.flatMap((p) => p.lieux || [])).size), l: "villes et lieux" },
    { n: nombre(liste.reduce((s, p) => s + photosDuJour(p).length, 0)), l: "photos" },
    { n: nombre(rencontres), l: "rencontres" },
  ];
  if (km.marche > 0) tuiles.push({ n: nombre(arrondiKm(km.marche)), l: "km à pied" });
  for (const t of km.transports.slice(0, 3)) tuiles.push({ n: nombre(arrondiKm(t.km)), l: `km ${t.cumul}`, ic: t.ic });
  return tuiles;
}

// Les temps qu'il a fait, du plus fréquent au plus rare.
export function meteosFrequentes(posts, meteoInfo) {
  const compte = new Map();
  for (const p of posts || []) {
    if (p.meteo?.code == null) continue;
    const m = meteoInfo(p.meteo.code);
    const cle = `${m.emoji} ${m.label}`.trim();
    compte.set(cle, (compte.get(cle) || 0) + 1);
  }
  return [...compte.entries()].sort((a, b) => b[1] - a[1]).map(([libelle, jours]) => ({ libelle, jours }));
}
