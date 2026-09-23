// La génération d'un résumé hebdomadaire échouait sur « Bad control character in
// string literal » : le modèle avait écrit de vrais retours à la ligne entre les
// paragraphes du contenu, au lieu de \n.
import test from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "../lib/server.js";

test("des retours à la ligne bruts dans une chaîne sont acceptés", () => {
  const raw = '{"titre": "Une semaine au Bajío", "contenu": "Premier paragraphe.\n\nDeuxième paragraphe."}';
  assert.throws(() => JSON.parse(raw), /control character/);
  assert.deepEqual(extractJson(raw), { titre: "Une semaine au Bajío", contenu: "Premier paragraphe.\n\nDeuxième paragraphe." });
});

test("tabulations et retours chariot bruts aussi", () => {
  assert.equal(extractJson('{"a": "x\ty\r\nz"}').a, "x\ty\r\nz");
});

test("les retours à la ligne hors des chaînes et les échappements existants restent intacts", () => {
  const raw = '{\n  "a": "déjà \\"cité\\" et \\\\n littéral",\n  "b": "ligne\nsuivante"\n}';
  assert.deepEqual(extractJson(raw), { a: 'déjà "cité" et \\n littéral', b: "ligne\nsuivante" });
});

test("préambule et fences markdown, avec retours bruts dans les chaînes", () => {
  const raw = 'Voici le résumé :\n```json\n{"titre": "T", "contenu": "a\nb"}\n```';
  assert.deepEqual(extractJson(raw), { titre: "T", contenu: "a\nb" });
});

test("une réponse sans JSON donne un message lisible", () => {
  assert.throws(() => extractJson("Désolé, je ne peux pas."), /JSON introuvable/);
});
