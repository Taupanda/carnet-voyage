// Reconstruction du texte dicté, isolée de React pour être testable.
//
// Trois comportements des moteurs de reconnaissance produisent des répétitions,
// et il faut les trois pour comprendre le code :
//
//  1. INSTANTANÉS CUMULATIFS — le moteur renvoie « alors », puis « alors
//     aujourd'hui », puis « alors aujourd'hui c'était ». Concaténer donne la
//     bouillie ; il faut ne garder que le plus complet.
//  2. REJEU AU REDÉMARRAGE — Chrome coupe après quelques secondes de silence.
//     La session suivante re-reconnaît parfois l'audio déjà transcrit, qui
//     revient alors s'ajouter à ce qu'on avait acquis.
//  3. CHEVAUCHEMENT PARTIEL — deux segments successifs partagent leurs mots du
//     milieu : « on est allés au marché » puis « au marché il y avait ».
//
// Un seul mécanisme les couvre tous : recoller() cherche le plus long
// chevauchement entre la fin de l'acquis et le début du nouveau, et n'ajoute
// que ce qui dépasse. Le cas 1 est un chevauchement total du début, le cas 2 un
// chevauchement total tout court, le cas 3 un chevauchement partiel.

// Mots normalisés, avec leur position dans le texte d'origine : la comparaison
// ignore casse et ponctuation, mais le texte rendu garde les siennes.
function decouper(texte, depuis = 0) {
  const mots = [];
  const re = /[\p{L}\p{N}]+/gu;
  re.lastIndex = depuis;
  let m;
  while ((m = re.exec(texte)) !== null) {
    mots.push({ cle: m[0].toLowerCase(), debut: m.index });
  }
  return mots;
}

// Un chevauchement ne peut venir que d'un énoncé rejoué : il est court. Limiter
// la comparaison à la fin de l'acquis et au début du segment garde le coût
// constant — sans ce plafond, chaque mot dicté re-découpait tout le texte déjà
// accumulé, et la saisie devenait poussive puis erratique sur une longue dictée.
const FENETRE = 400;

// Début d'une tranche de fin de texte, calé sur une frontière de mot : sans ça
// le premier « mot » de la tranche serait un fragment qui ne correspondrait à rien.
function debutTranche(texte) {
  if (texte.length <= FENETRE) return 0;
  const coupe = texte.length - FENETRE;
  const espace = texte.indexOf(" ", coupe);
  return espace === -1 ? coupe : espace + 1;
}

export function recoller(acc, seg) {
  const a = (acc || "").trim();
  const b = (seg || "").trim();
  if (!a) return b;
  if (!b) return a;

  const ma = decouper(a, debutTranche(a));
  const mb = decouper(b.slice(0, FENETRE));
  if (!ma.length || !mb.length) return a + " " + b;

  // Le plus long suffixe de `a` qui est aussi un préfixe de `b`. On part du
  // plus long : « oui oui » dicté pour de vrai garde ses deux « oui », parce
  // que seul le chevauchement d'un mot est retiré, pas la répétition entière.
  let k = 0;
  for (let n = Math.min(ma.length, mb.length); n >= 1; n--) {
    let egal = true;
    for (let i = 0; i < n; i++) {
      if (ma[ma.length - n + i].cle !== mb[i].cle) { egal = false; break; }
    }
    if (egal) { k = n; break; }
  }

  if (k === 0) return a + " " + b;
  if (k === mb.length) {
    // `b` entier est déjà là — sauf s'il dépassait la fenêtre, auquel cas il
    // reste la partie non comparée à ajouter.
    const reste = b.length > FENETRE ? b.slice(FENETRE).trim() : "";
    return reste ? a + " " + reste : a;
  }
  // Un chevauchement d'UN SEUL mot est ambigu : « il a dit oui » suivi de
  // « oui bien sûr » est une vraie répétition dictée, pas un artefact. On ne le
  // retire que si tout l'acquis est repris — c'est alors un instantané
  // cumulatif, « alors » devenant « alors aujourd'hui ».
  if (k === 1 && ma.length > 1) return a + " " + b;
  const reste = b.slice(mb[k].debut).trim();
  return reste ? a + " " + reste : a;
}

// L'état d'une dictée en cours. `acquis` survit aux redémarrages du moteur,
// `session` est ce que la session courante a reconnu jusqu'ici.
export function creerDictee(texteExistant = "") {
  let acquis = (texteExistant || "").trim();
  let session = "";
  // Les définitifs ne changent plus une fois émis : on garde leur fusion et on
  // n'ajoute que les nouveaux. Les refusionner tous à chaque événement rendait
  // le coût quadratique, et la dictée se dégradait à mesure qu'elle s'allongeait.
  let nbFinauxVus = 0;
  let finauxFusionnes = "";

  return {
    // `resultats` est la liste COMPLÈTE du moteur, pas un delta : on
    // reconstruit à chaque fois plutôt que d'accumuler, donc rejouer les mêmes
    // événements redonne exactement le même texte.
    surResultat(resultats) {
      const liste = resultats || [];
      const finaux = [];
      let provisoire = "";
      for (const r of liste) {
        const t = ((r && r.transcript) || "").trim();
        if (!t) continue;
        // Le provisoire n'est jamais cumulé : les précédents sont des versions
        // tronquées de la même phrase, seul le dernier compte. Et un provisoire
        // ANTÉRIEUR à un définitif est une version périmée de la même phrase :
        // le garder la faisait réapparaître en double.
        if (r.isFinal) { finaux.push(t); provisoire = ""; }
        else provisoire = t;
      }
      // Reprise du travail déjà fait, sauf si la liste a été réinitialisée.
      let debut = 0;
      let fini = "";
      if (finaux.length >= nbFinauxVus) { debut = nbFinauxVus; fini = finauxFusionnes; }
      for (let i = debut; i < finaux.length; i++) fini = recoller(fini, finaux[i]);
      nbFinauxVus = finaux.length;
      finauxFusionnes = fini;

      session = fini;
      return recoller(acquis, recoller(fini, provisoire));
    },
    // La session se termine : ce qu'elle a reconnu rejoint l'acquis.
    surFin() {
      acquis = recoller(acquis, session);
      session = "";
      nbFinauxVus = 0;
      finauxFusionnes = "";
      return acquis;
    },
    // Message envoyé : table rase, y compris pour la session en cours.
    purger() {
      acquis = "";
      session = "";
      nbFinauxVus = 0;
      finauxFusionnes = "";
      return "";
    },
    texte() {
      return recoller(acquis, session);
    },
  };
}
