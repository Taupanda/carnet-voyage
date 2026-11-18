// Les anecdotes rassemblées : une par ligne du post, la plus récente en tête,
// l'étoile retrouvée malgré des espaces différents, et la recherche.
import test from "node:test";
import assert from "node:assert/strict";
import { rassemblerAnecdotes, filtrerAnecdotes, cleAnecdote } from "../lib/anecdotes.js";

const entries = [
  { date: "2026-11-10", day_number: 63, titre: "Mérida", lieux: ["Mérida"], anecdote: "Le chauffeur chantait.\nUn iguane sur la table.", status: "published" },
  { date: "2026-11-15", day_number: 68, titre: "Izamal", lieux: ["Izamal"], anecdote: "  La ville  toute jaune. ", status: "draft" },
  { date: "2026-11-12", day_number: 65, titre: "Sans anecdote", anecdote: null },
];

test("une anecdote par ligne, la journée la plus récente en tête, dans l'ordre du post", () => {
  const l = rassemblerAnecdotes(entries, []);
  assert.deepEqual(l.map((a) => a.texte), ["La ville toute jaune.", "Le chauffeur chantait.", "Un iguane sur la table."]);
  assert.deepEqual(l.map((a) => a.rang), [0, 0, 1]);
  assert.equal(l[0].brouillon, true);
  assert.deepEqual(l[1].lieux, ["Mérida"]);
});

test("l'étoile se retrouve par journée et texte, aux espaces près", () => {
  const l = rassemblerAnecdotes(entries, [{ entry_date: "2026-11-15", texte: "La ville toute jaune." }, { entry_date: "2026-11-11", texte: "Un iguane sur la table." }]);
  assert.deepEqual(l.map((a) => a.etoile), [true, false, false], "même texte un autre jour : pas d'étoile");
  assert.equal(cleAnecdote("2026-11-15", "  La ville\n toute jaune. "), "2026-11-15|La ville toute jaune.");
});

test("filtre des préférées et recherche sans accents, dans le texte et les lieux", () => {
  const l = rassemblerAnecdotes(entries, [{ entry_date: "2026-11-10", texte: "Le chauffeur chantait." }]);
  assert.deepEqual(filtrerAnecdotes(l, { etoilees: true }).map((a) => a.texte), ["Le chauffeur chantait."]);
  assert.deepEqual(filtrerAnecdotes(l, { recherche: "merida" }).map((a) => a.texte), ["Le chauffeur chantait.", "Un iguane sur la table."]);
  assert.deepEqual(filtrerAnecdotes(l, { recherche: "IGUANE" }).map((a) => a.rang), [1]);
  assert.equal(filtrerAnecdotes(l, { etoilees: true, recherche: "iguane" }).length, 0);
});
