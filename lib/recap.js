// Le résumé illustré d'une semaine. L'IA écrit le texte — une accroche et
// quelques chapitres rattachés à des jours — mais ne choisit ni n'invente
// aucune image : les photos viennent des posts de ces jours, placées ici.
// Pages, e-mail et éditeur partent tous de ces fonctions.
import { cumulKm, arrondiKm } from "./geo.js";

export const MAX_SECTIONS = 4;
export const PHOTOS_PAR_SECTION = 3;

const texte = (v, max) => String(v ?? "").trim().slice(0, max);
const nombre = (n) => Number(n).toLocaleString("fr-FR");

// Les photos d'une journée, la principale en tête (même ordre que sur le post).
export function photosDuJour(e) {
  const photos = Array.isArray(e?.photos) ? e.photos.filter((u) => typeof u === "string" && u) : [];
  const p = e?.photo_principale;
  return p && photos.includes(p) ? [p, ...photos.filter((u) => u !== p)] : photos;
}

// Les chiffres de la semaine. Pas de total de kilomètres : additionner la marche
// et l'avion ne dirait rien. La marche d'un côté, le transport le plus utilisé
// de l'autre.
export function chiffresSemaine(entrees) {
  const liste = entrees || [];
  const out = [{ n: nombre(liste.length), l: liste.length > 1 ? "jours racontés" : "jour raconté" }];
  const villes = new Set(liste.flatMap((e) => (Array.isArray(e.lieux) ? e.lieux : []))).size;
  if (villes) out.push({ n: nombre(villes), l: villes > 1 ? "villes" : "ville" });
  const photos = liste.reduce((s, e) => s + photosDuJour(e).length, 0);
  if (photos) out.push({ n: nombre(photos), l: photos > 1 ? "photos" : "photo" });
  const km = cumulKm(liste);
  if (km.marche > 0) out.push({ n: nombre(arrondiKm(km.marche)), l: "km à pied" });
  const principal = km.transports[0];
  if (principal?.km > 0) out.push({ n: nombre(arrondiKm(principal.km)), l: `km ${principal.cumul}` });
  return out;
}

// La couverture : la photo principale du jour le plus photographié.
export function choisirCouverture(entrees) {
  let meilleure = null;
  let max = 0;
  for (const e of entrees || []) {
    const photos = photosDuJour(e);
    if (photos.length > max) { max = photos.length; meilleure = photos[0]; }
  }
  return meilleure;
}

// Jusqu'à PHOTOS_PAR_SECTION photos des jours du chapitre, un jour après
// l'autre (la principale de chacun d'abord), sans reprendre une photo déjà
// utilisée ailleurs dans le résumé.
function photosPourJours(jours, parDate, utilisees) {
  const files = jours.map((d) => (parDate.get(d) || []).filter((u) => !utilisees.has(u)));
  const out = [];
  for (let rang = 0; out.length < PHOTOS_PAR_SECTION && files.some((f) => rang < f.length); rang++) {
    for (const f of files) {
      if (out.length >= PHOTOS_PAR_SECTION) break;
      if (f[rang] && !utilisees.has(f[rang])) { out.push(f[rang]); utilisees.add(f[rang]); }
    }
  }
  return out;
}

function contexte(entrees) {
  const parDate = new Map((entrees || []).map((e) => [e.date, photosDuJour(e)]));
  const permises = new Set([...parDate.values()].flat());
  return { parDate, permises, dates: new Set(parDate.keys()) };
}

function sectionsPropres(brutes, dates) {
  return (Array.isArray(brutes) ? brutes : [])
    .map((s) => ({
      titre: texte(s?.titre, 120),
      texte: texte(s?.texte, 2500),
      jours: [...new Set((Array.isArray(s?.jours) ? s.jours : []).filter((d) => dates.has(d)))].sort(),
      photos: Array.isArray(s?.photos) ? s.photos : [],
    }))
    .filter((s) => s.texte)
    .slice(0, MAX_SECTIONS);
}

// Ce que l'IA a rendu, transformé en résumé affichable : textes bornés, jours
// ramenés à ceux qui ont un post, photos placées ici.
export function miseEnPageDepuisIA(ia, entrees) {
  const { parDate, dates } = contexte(entrees);
  let sections = sectionsPropres(ia?.sections, dates);
  // Réponse à l'ancienne (un seul bloc de texte) : un chapitre couvrant la semaine.
  if (!sections.length && texte(ia?.contenu, 5000)) {
    sections = [{ titre: "", texte: texte(ia.contenu, 5000), jours: [...dates].sort(), photos: [] }];
  }
  const couverture = choisirCouverture(entrees);
  const utilisees = new Set(couverture ? [couverture] : []);
  return {
    chapeau: texte(ia?.chapeau, 600),
    couverture,
    sections: sections.map((s) => ({ ...s, photos: photosPourJours(s.jours, parDate, utilisees) })),
  };
}

// Ce que l'éditeur renvoie, vérifié : seules les photos des posts de la semaine
// sont acceptées — une adresse d'image arbitraire n'a rien à faire dans un
// e-mail envoyé aux proches.
export function miseEnPageDepuisEditeur(saisie, entrees) {
  const { permises, dates } = contexte(entrees);
  const garder = (liste) => [...new Set((liste || []).filter((u) => permises.has(u)))].slice(0, PHOTOS_PAR_SECTION);
  return {
    chapeau: texte(saisie?.chapeau, 600),
    couverture: permises.has(saisie?.couverture) ? saisie.couverture : choisirCouverture(entrees),
    sections: sectionsPropres(saisie?.sections, dates).map((s) => ({ ...s, photos: garder(s.photos) })),
  };
}

// La version texte seul, gardée dans `contenu` : aperçu de la notification, et
// repli pour tout ce qui ne sait pas afficher les chapitres.
export function contenuTexte(mp) {
  return [
    texte(mp?.chapeau, 600),
    ...(mp?.sections || []).map((s) => [texte(s.titre, 120), texte(s.texte, 2500)].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n");
}

// Les paragraphes d'un texte saisi, séparés par une ligne vide.
export const paragraphes = (t) => String(t || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
