// Les 12 étapes du voyage, alignées sur le planning ajusté (artefact « Bajío,
// Barranca, Baja », 15 septembre 2026) : Puebla sort du voyage au profit de
// Guadalajara, par où passe le retour de Basse Californie, et la côte
// oaxaqueña s'enchaîne directement au vol Guadalajara → Puerto Escondido.
//
// Ce sont les valeurs par défaut. L'écran « Étapes » peut ajuster noms et dates :
// ses choix vivent dans la table `etapes` et sont fusionnés par-dessus (voir
// fusionnerEtapes). Cette liste reste la référence du nombre d'étapes et de
// leurs couleurs, et le repli si la base est vide, injoignable ou incohérente.
export const ETAPES_DEFAUT = [
  { n: 1,  nom: "Mexico City",             debut: "2026-09-08", fin: "2026-09-15", couleur: "#FF3D7F" },
  { n: 2,  nom: "Le Bajío",                debut: "2026-09-16", fin: "2026-09-22", couleur: "#FF8A3D" },
  { n: 3,  nom: "Sierra Tarahumara",       debut: "2026-09-23", fin: "2026-09-27", couleur: "#E2563C" },
  { n: 4,  nom: "Basse Californie",        debut: "2026-09-28", fin: "2026-10-11", couleur: "#2FA8E0" },
  { n: 5,  nom: "Guadalajara",             debut: "2026-10-12", fin: "2026-10-14", couleur: "#9AA7B8" },
  { n: 6,  nom: "Côte oaxaqueña",          debut: "2026-10-15", fin: "2026-10-27", couleur: "#18C6BC" },
  { n: 7,  nom: "Oaxaca & Día de Muertos", debut: "2026-10-28", fin: "2026-11-02", couleur: "#A855F7" },
  { n: 8,  nom: "Chiapas",                 debut: "2026-11-03", fin: "2026-11-11", couleur: "#3FBF6F" },
  { n: 9,  nom: "Yucatán",                 debut: "2026-11-12", fin: "2026-11-25", couleur: "#22C1D6" },
  { n: 10, nom: "Belize",                  debut: "2026-11-26", fin: "2026-12-02", couleur: "#0FD0C0" },
  { n: 11, nom: "Guatemala",               debut: "2026-12-03", fin: "2026-12-12", couleur: "#5FBF4A" },
  { n: 12, nom: "Salvador",                debut: "2026-12-13", fin: "2026-12-17", couleur: "#F2B33D" },
];

// Le départ ne se déplace pas : chaque post enregistre son numéro de jour,
// calculé depuis cette date au moment de l'écriture. La bouger décalerait tous
// les « Jour X » déjà publiés.
export const DEPART = ETAPES_DEFAUT[0].debut;

const jourUTC = (d) => new Date(d + "T00:00:00Z");
const ecartJours = (a, b) => Math.round((jourUTC(b) - jourUTC(a)) / 86400000);
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const lendemain = (d) => new Date(jourUTC(d).getTime() + 86400000).toISOString().slice(0, 10);

export function stageDays(s) {
  return ecartJours(s.debut, s.fin) + 1;
}

// Ce qui rend un découpage utilisable : les douze étapes, dans l'ordre, qui se
// suivent jour après jour depuis le départ. Renvoie la liste des problèmes,
// vide quand tout va bien.
export function erreursEtapes(etapes) {
  if (!Array.isArray(etapes) || etapes.length !== ETAPES_DEFAUT.length) {
    return [`il faut ${ETAPES_DEFAUT.length} étapes`];
  }
  const erreurs = [];
  etapes.forEach((s, i) => {
    const nom = String(s.nom || "").trim() || `Étape ${i + 1}`;
    if (s.n !== i + 1) erreurs.push(`${nom} : numéro ${s.n} au lieu de ${i + 1}`);
    if (!String(s.nom || "").trim()) erreurs.push(`étape ${i + 1} : nom vide`);
    if (!DATE_ISO.test(s.debut || "") || !DATE_ISO.test(s.fin || "")) {
      erreurs.push(`${nom} : date invalide`);
      return;
    }
    if (s.fin < s.debut) erreurs.push(`${nom} finit avant de commencer`);
    if (i === 0 && s.debut !== DEPART) erreurs.push(`le voyage doit commencer le ${DEPART}`);
    if (i > 0 && DATE_ISO.test(etapes[i - 1].fin || "") && s.debut !== lendemain(etapes[i - 1].fin)) {
      erreurs.push(`${nom} doit commencer le lendemain de la fin de l'étape précédente`);
    }
  });
  return erreurs;
}

// Les lignes de la table `etapes` par-dessus les étapes par défaut, numéro par
// numéro. Un découpage incohérent n'est jamais affiché : on retombe alors sur
// les valeurs par défaut plutôt que de casser le calendrier du blog.
export function fusionnerEtapes(lignes) {
  if (!Array.isArray(lignes) || !lignes.length) return ETAPES_DEFAUT;
  const parN = new Map(lignes.map((l) => [Number(l.n), l]));
  const etapes = ETAPES_DEFAUT.map((d) => {
    const l = parN.get(d.n);
    return l ? { ...d, nom: String(l.nom || "").trim() || d.nom, debut: l.debut, fin: l.fin } : d;
  });
  return erreursEtapes(etapes).length ? ETAPES_DEFAUT : etapes;
}

// Tout ce qui se déduit du découpage. Côté serveur : calendrierServeur() ;
// côté client : useCalendrier(). Les deux partent de la même liste.
export function creerCalendrier(etapes = ETAPES_DEFAUT) {
  const TRIP_START = etapes[0].debut;
  const TRIP_END = etapes[etapes.length - 1].fin;
  const TRIP_DAYS = ecartJours(TRIP_START, TRIP_END);
  return {
    STAGES: etapes,
    TRIP_START,
    TRIP_END,
    // Le 8 septembre = jour 0 ; TRIP_DATES compte les dates réelles.
    TRIP_DAYS,
    TRIP_DATES: TRIP_DAYS + 1,
    stageForDate: (d) => etapes.find((s) => d >= s.debut && d <= s.fin) || null,
  };
}

export function dayNumberOf(dateStr) {
  return ecartJours(DEPART, dateStr);
}

// Fuseau du voyage. Le décalage était figé à UTC-6, ce qui tombait juste à
// Mexico en hiver seulement : faux pendant l'heure d'été mexicaine, et faux dès
// le Guatemala ou le Belize. Intl applique les vraies règles du fuseau, heure
// d'été comprise.
export const TRIP_TZ =
  process.env.NEXT_PUBLIC_TRIP_TIMEZONE || process.env.TRIP_TIMEZONE || "America/Mexico_City";

// "en-CA" produit exactement AAAA-MM-JJ, le format utilisé partout en base.
export function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TRIP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Le voyage commence au jour 1, pas au jour 0 : dayNumberOf reste l'écart en
// jours depuis le départ (utile aux calculs), afficheJour est ce qu'on montre.
export const afficheJour = (n) => (Number.isFinite(Number(n)) ? Number(n) + 1 : null);

export function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// « 16 – 22 sept » dans un même mois, « 28 sept – 11 oct » à cheval sur deux.
export function plageDates(debut, fin) {
  const date = (d) => new Date(d + "T00:00:00Z");
  const mois = (d) => date(d).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }).replace(".", "");
  const jour = (d) => date(d).getUTCDate();
  return mois(debut) === mois(fin)
    ? `${jour(debut)} – ${jour(fin)} ${mois(fin)}`
    : `${jour(debut)} ${mois(debut)} – ${jour(fin)} ${mois(fin)}`;
}

// Les anecdotes tiennent dans une seule colonne texte, une par ligne. Éviter une
// colonne jsonb dédiée garde les posts déjà publiés valides sans migration :
// une anecdote unique est simplement une liste d'un élément.
export const decoupeAnecdotes = (v) =>
  typeof v === "string" ? v.split("\n").map((x) => x.trim()).filter(Boolean) : [];

export const colleAnecdotes = (liste) =>
  (Array.isArray(liste) ? liste : []).map((x) => String(x).trim()).filter(Boolean).join("\n");
