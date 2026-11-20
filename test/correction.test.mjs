// La relecture par Claude corrige les mots écorchés, et seulement eux : une
// réécriture trop large est refusée, une panne rend le texte brut.
import test from "node:test";
import assert from "node:assert/strict";
import { corrigerTranscription, ecartMots, ECART_MAX } from "../lib/correction.js";

const brut = "Ce matin j'ai pris le colectivo jusqu'à Isabelle, la ville jaune, et j'ai mangé des panuchos.";
const claude = (reponse) => {
  const appels = [];
  const f = async (system, messages, max) => { appels.push({ system, messages, max }); if (reponse instanceof Error) throw reponse; return reponse; };
  return { f, appels };
};

test("un nom propre écorché est corrigé, le reste ne bouge pas", async () => {
  const { f, appels } = claude("Ce matin j'ai pris le colectivo jusqu'à Izamal, la ville jaune, et j'ai mangé des panuchos.");
  const r = await corrigerTranscription(brut, { indices: ["Izamal", "Mérida"], callClaude: f });
  assert.equal(r.texte, "Ce matin j'ai pris le colectivo jusqu'à Izamal, la ville jaune, et j'ai mangé des panuchos.");
  assert.equal(r.corrige, true);
  assert.match(appels[0].system, /Izamal, Mérida/);
  assert.equal(appels[0].messages[0].content, brut);
});

test("une réécriture qui change trop de mots est refusée", async () => {
  const { f } = claude("Ce matin, je me suis rendu en minibus à Izamal, cité jaune, où j'ai dégusté des panuchos.");
  const r = await corrigerTranscription(brut, { callClaude: f });
  assert.equal(r.texte, brut);
  assert.equal(r.corrige, false);
});

test("Claude indisponible : le texte brut arrive quand même", async () => {
  const { f } = claude(new Error("529"));
  assert.deepEqual(await corrigerTranscription(brut, { callClaude: f }), { texte: brut, corrige: false });
  assert.deepEqual(await corrigerTranscription("  ", { callClaude: f }), { texte: "", corrige: false });
});

test("l'écart se mesure en mots, accents et ponctuation à part", () => {
  assert.equal(ecartMots("Il était à Mérida.", "il etait a merida"), 0);
  assert.ok(ecartMots(brut, brut.replace("Isabelle", "Izamal")) < 0.1);
  assert.ok(ecartMots("un deux trois quatre cinq", "six sept huit neuf dix") > ECART_MAX);
});
