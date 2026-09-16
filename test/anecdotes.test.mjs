// Le bouton « + Une autre anecdote » ne faisait rien : il ajoutait une ligne
// vide à la chaîne, et le découpage écarte justement les lignes vides. Ces
// tests fixent le contrat des deux côtés — la chaîne qui ne garde que le plein,
// et la liste de l'éditeur où un champ vide a le droit d'attendre d'être rempli.
import test from "node:test";
import assert from "node:assert/strict";
import { decoupeAnecdotes, colleAnecdotes } from "../lib/stages.js";

test("la chaîne stockée ne garde jamais d'anecdote vide", () => {
  // C'est voulu : une ligne blanche oubliée ferait une anecdote fantôme sur le blog.
  assert.deepEqual(decoupeAnecdotes(colleAnecdotes(["une histoire", ""])), ["une histoire"]);
  assert.deepEqual(decoupeAnecdotes("une histoire\n \n"), ["une histoire"]);
  assert.deepEqual(decoupeAnecdotes(""), []);
  assert.deepEqual(decoupeAnecdotes(null), []);
});

test("l'ancien bouton n'ajoutait rien — la preuve du bug", () => {
  const avant = "J'ai commandé des cabellos au lieu de caballos";
  const ancien = avant.replace(/\s+$/, "") + (avant.trim() ? "\n" : "") + " ";
  assert.equal(decoupeAnecdotes(ancien).length, 1, "un seul champ : le nouveau avait disparu");
});

// Ce que fait l'éditeur maintenant : sa liste tolère le vide, et seule la
// version recollée — sans les vides — repart dans le post.
function editeur(chaine) {
  let liste = decoupeAnecdotes(chaine);
  if (!liste.length) liste = [""];
  let poste = colleAnecdotes(liste);
  return {
    champs: () => liste,
    ajouter() { liste = [...liste, ""]; poste = colleAnecdotes(liste); },
    ecrire(i, v) { liste = liste.map((a, j) => (j === i ? v : a)); poste = colleAnecdotes(liste); },
    retirer(i) { liste = liste.filter((_, j) => j !== i); if (!liste.length) liste = [""]; poste = colleAnecdotes(liste); },
    enBase: () => poste,
  };
}

test("ajouter fait bien apparaître un champ, et le remplir l'enregistre", () => {
  const e = editeur("La dame du marché a éclaté de rire");
  e.ajouter();
  assert.equal(e.champs().length, 2, "le champ vide existe à l'écran");
  assert.equal(e.enBase(), "La dame du marché a éclaté de rire", "mais rien de vide en base");
  e.ecrire(1, "Le chien de l'auberge m'a suivi jusqu'au métro");
  assert.deepEqual(decoupeAnecdotes(e.enBase()), [
    "La dame du marché a éclaté de rire",
    "Le chien de l'auberge m'a suivi jusqu'au métro",
  ]);
});

test("une journée sans anecdote offre quand même un champ où écrire", () => {
  const e = editeur("");
  assert.deepEqual(e.champs(), [""]);
  e.ecrire(0, "Première histoire");
  assert.equal(e.enBase(), "Première histoire");
});

test("retirer la dernière anecdote laisse un champ, pas le vide", () => {
  const e = editeur("Seule histoire");
  e.retirer(0);
  assert.deepEqual(e.champs(), [""]);
  assert.equal(e.enBase(), "");
});

test("deux champs vides d'affilée ne créent pas d'anecdotes fantômes", () => {
  const e = editeur("Une histoire");
  e.ajouter();
  e.ajouter();
  assert.equal(e.champs().length, 3);
  assert.equal(decoupeAnecdotes(e.enBase()).length, 1);
});
