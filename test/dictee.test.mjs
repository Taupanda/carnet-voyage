// Les répétitions de la dictée sont revenues trois fois. Chaque scénario ici
// est un comportement réel de moteur observé sur le téléphone, rejoué à
// l'identique : c'est ce qui doit empêcher une quatrième fois.
import test from "node:test";
import assert from "node:assert/strict";
import { recoller, creerDictee } from "../lib/dictee.js";

// Un moteur qui délivre une liste cumulative, comme le vrai.
function moteur(d) {
  const resultats = [];
  return {
    provisoire(t) {
      if (resultats.length && !resultats[resultats.length - 1].isFinal) resultats.pop();
      resultats.push({ transcript: t, isFinal: false });
      return d.surResultat(resultats);
    },
    definitif(t) {
      if (resultats.length && !resultats[resultats.length - 1].isFinal) resultats.pop();
      resultats.push({ transcript: t, isFinal: true });
      return d.surResultat(resultats);
    },
  };
}

test("les instantanés cumulatifs ne s'empilent pas", () => {
  // La séquence exacte rapportée : quatorze instantanés pour une phrase.
  const phrase = "alors aujourd'hui c'était ma première journée de voyage";
  const mots = phrase.split(" ");
  const d = creerDictee();
  const m = moteur(d);
  let vu = "";
  for (let i = 1; i < mots.length; i++) vu = m.provisoire(mots.slice(0, i).join(" "));
  vu = m.definitif(phrase);
  assert.equal(vu, phrase);
});

test("le rejeu au redémarrage ne duplique pas la phrase", () => {
  const d = creerDictee();
  moteur(d).definitif("bonjour tout le monde");
  assert.equal(d.surFin(), "bonjour tout le monde");
  // Nouvelle session : le moteur re-reconnaît l'audio déjà transcrit.
  const m2 = moteur(d);
  assert.equal(m2.definitif("bonjour tout le monde"), "bonjour tout le monde");
  // …et il double même parfois en repartant un peu avant.
  assert.equal(m2.definitif("le monde était là"), "bonjour tout le monde était là");
});

test("trois redémarrages d'affilée n'accumulent rien", () => {
  const d = creerDictee();
  for (let i = 0; i < 3; i++) {
    moteur(d).definitif("j'ai visité le marché de Coyoacán");
    d.surFin();
  }
  assert.equal(d.texte(), "j'ai visité le marché de Coyoacán");
});

test("des phrases distinctes s'ajoutent bien", () => {
  const d = creerDictee();
  const m = moteur(d);
  m.definitif("on est allés au marché");
  assert.equal(m.definitif("ensuite on a mangé des tacos"),
    "on est allés au marché ensuite on a mangé des tacos");
});

test("un chevauchement partiel est recollé une seule fois", () => {
  assert.equal(recoller("on est allés au marché", "au marché il y avait du monde"),
    "on est allés au marché il y avait du monde");
});

test("une vraie répétition dictée survit", () => {
  // « oui oui » : seul le chevauchement d'un mot est retiré, pas la répétition.
  assert.equal(recoller("il a dit oui", "oui bien sûr on y va"),
    "il a dit oui oui bien sûr on y va");
});

test("rejouer les mêmes événements redonne le même texte", () => {
  const evts = [
    { transcript: "je", isFinal: false },
    { transcript: "je suis", isFinal: false },
    { transcript: "je suis fatigué", isFinal: true },
  ];
  const d = creerDictee();
  const a = d.surResultat(evts);
  const b = d.surResultat(evts);
  const c = d.surResultat(evts);
  assert.equal(a, "je suis fatigué");
  assert.equal(b, a);
  assert.equal(c, a);
});

test("envoyer un message repart d'une feuille blanche", () => {
  const d = creerDictee();
  moteur(d).definitif("alors aujourd'hui on est allés au marché");
  assert.equal(d.purger(), "");
  // Session neuve après l'envoi : rien de l'ancienne ne doit revenir.
  const m2 = moteur(d);
  assert.equal(m2.definitif("oui c'était un bon repas"), "oui c'était un bon repas");
});

test("le texte déjà tapé au clavier est conservé", () => {
  const d = creerDictee("note écrite à la main");
  assert.equal(moteur(d).definitif("et la suite dictée"),
    "note écrite à la main et la suite dictée");
});

test("le provisoire ne laisse pas de trace quand le définitif le corrige", () => {
  const d = creerDictee();
  const m = moteur(d);
  m.provisoire("chapulines au marché");
  // Le moteur se corrige : le provisoire ne doit pas rester à côté.
  assert.equal(m.definitif("des chapulines au marché"), "des chapulines au marché");
});

test("segments vides et bruit ignorés", () => {
  const d = creerDictee();
  assert.equal(d.surResultat([{ transcript: "   ", isFinal: true }]), "");
  assert.equal(d.surResultat([]), "");
  assert.equal(recoller("", ""), "");
  assert.equal(recoller("seul", ""), "seul");
  assert.equal(recoller("", "seul"), "seul");
});
