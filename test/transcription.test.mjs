// Enregistrer, puis transcrire : le choix du service, le format annoncé au
// service, les noms propres soufflés, et le repli quand ces indices gênent.
import test from "node:test";
import assert from "node:assert/strict";
import { transcrireAudio, fournisseurTranscription, extensionAudio, nettoyerIndices } from "../lib/transcription.js";
import { ajouterTexte, dureeLisible } from "../lib/enregistreur.js";

const son = (type = "audio/webm;codecs=opus") => new Blob([new Uint8Array([1, 2, 3])], { type });

function fauxService(reponses) {
  const appels = [];
  const fetchImpl = async (url, init) => {
    const champs = {};
    for (const [k, v] of init.body.entries()) (champs[k] ||= []).push(v);
    appels.push({ url, auth: init.headers.Authorization, champs });
    const r = reponses[Math.min(appels.length - 1, reponses.length - 1)];
    return new Response(JSON.stringify(r.corps), { status: r.status });
  };
  return { appels, fetchImpl };
}

test("Mistral est préféré quand les deux clés existent", () => {
  assert.equal(fournisseurTranscription({ MISTRAL_API_KEY: "m", OPENAI_API_KEY: "o" }).nom, "mistral");
  assert.equal(fournisseurTranscription({ OPENAI_API_KEY: "o" }).nom, "openai");
  assert.equal(fournisseurTranscription({}), null);
});

test("sans clé, un message qui dit quoi ajouter", async () => {
  await assert.rejects(transcrireAudio(son(), { env: {} }), (e) => e.status === 503 && /MISTRAL_API_KEY/.test(e.message));
});

test("les formats des téléphones sont reconnus", () => {
  assert.equal(extensionAudio("audio/webm;codecs=opus"), "webm"); // Android
  assert.equal(extensionAudio("audio/mp4"), "mp4");               // iPhone
  assert.equal(extensionAudio("audio/ogg;codecs=opus"), "ogg");
  assert.equal(extensionAudio("image/png"), null);
});

test("Mistral : français, Voxtral, noms propres en context_bias", async () => {
  const { appels, fetchImpl } = fauxService([{ status: 200, corps: { text: "  On est allés à  Todos Santos. " } }]);
  const texte = await transcrireAudio(son(), { env: { MISTRAL_API_KEY: "k" }, fetchImpl, indices: ["Todos Santos", "todos santos", "", "Cabo Pulmo"] });
  assert.equal(texte, "On est allés à Todos Santos.");
  assert.equal(appels[0].url, "https://api.mistral.ai/v1/audio/transcriptions");
  assert.equal(appels[0].auth, "Bearer k");
  assert.deepEqual(appels[0].champs.language, ["fr"]);
  assert.deepEqual(appels[0].champs.model, ["voxtral-mini-latest"]);
  assert.deepEqual(appels[0].champs.context_bias, ["Todos Santos", "Cabo Pulmo"]);
  assert.equal(appels[0].champs.file[0].name, "enregistrement.webm");
});

test("OpenAI : les noms propres passent dans le prompt", async () => {
  const { appels, fetchImpl } = fauxService([{ status: 200, corps: { text: "ok" } }]);
  await transcrireAudio(son("audio/mp4"), { env: { OPENAI_API_KEY: "k" }, fetchImpl, indices: ["Creel"] });
  assert.deepEqual(appels[0].champs.model, ["gpt-4o-transcribe"]);
  assert.match(appels[0].champs.prompt[0], /Creel/);
  assert.equal(appels[0].champs.file[0].name, "enregistrement.mp4");
});

test("indices refusés par le service : on retente sans, l'enregistrement n'est pas perdu", async () => {
  const { appels, fetchImpl } = fauxService([
    { status: 422, corps: { message: "context_bias invalide" } },
    { status: 200, corps: { text: "transcrit" } },
  ]);
  assert.equal(await transcrireAudio(son(), { env: { MISTRAL_API_KEY: "k" }, fetchImpl, indices: ["Creel"] }), "transcrit");
  assert.equal(appels.length, 2);
  assert.equal(appels[1].champs.context_bias, undefined);
});

test("une clé refusée remonte telle quelle, sans seconde tentative", async () => {
  const { appels, fetchImpl } = fauxService([{ status: 401, corps: { error: { message: "Invalid API key" } } }]);
  await assert.rejects(transcrireAudio(son(), { env: { OPENAI_API_KEY: "k" }, fetchImpl, indices: ["x"] }), /Invalid API key/);
  assert.equal(appels.length, 1);
});

test("au plus cent indices, sans doublon", () => {
  const l = nettoyerIndices([...Array.from({ length: 150 }, (_, i) => `Lieu ${i}`), "Lieu 3"]);
  assert.equal(l.length, 100);
  assert.equal(new Set(l).size, 100);
});

test("le texte transcrit s'ajoute à ce qui est déjà écrit", () => {
  assert.equal(ajouterTexte("", "Bonjour."), "Bonjour.");
  assert.equal(ajouterTexte("J'ai vu ", " la mer."), "J'ai vu la mer.");
  assert.equal(ajouterTexte("Déjà là", "  "), "Déjà là");
  assert.equal(dureeLisible(83), "1:23");
});
