// Enregistrer, puis transcrire : le choix du service, le format annoncé au
// service, les noms propres soufflés, et le repli quand ces indices gênent.
import test from "node:test";
import assert from "node:assert/strict";
import { transcrireAudio, fournisseurTranscription, extensionAudio, nettoyerIndices, trousTranscription } from "../lib/transcription.js";
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

test("OpenAI est préféré quand les deux clés existent", () => {
  assert.equal(fournisseurTranscription({ MISTRAL_API_KEY: "m", OPENAI_API_KEY: "o" }).nom, "openai");
  assert.equal(fournisseurTranscription({ MISTRAL_API_KEY: "m" }).nom, "mistral");
  assert.equal(fournisseurTranscription({}), null);
  assert.deepEqual(fournisseurTranscription({ OPENAI_API_KEY: "o", OPENAI_TRANSCRIPTION_MODEL: "whisper-1" }).modeles, ["whisper-1"]);
});

test("sans clé, un message qui dit quoi ajouter", async () => {
  await assert.rejects(transcrireAudio(son(), { env: {} }), (e) => e.status === 503 && /GROQ_API_KEY/.test(e.message));
});

test("les formats des téléphones sont reconnus", () => {
  assert.equal(extensionAudio("audio/webm;codecs=opus"), "webm"); // Android
  assert.equal(extensionAudio("audio/mp4"), "mp4");               // iPhone
  assert.equal(extensionAudio("audio/ogg;codecs=opus"), "ogg");
  assert.equal(extensionAudio("image/png"), null);
});

test("Mistral : français, Voxtral, noms propres en context_bias", async () => {
  const { appels, fetchImpl } = fauxService([{ status: 200, corps: { text: "  On est allés à  Todos Santos. " } }]);
  const { texte } = await transcrireAudio(son(), { env: { MISTRAL_API_KEY: "k" }, fetchImpl, indices: ["Todos Santos", "todos santos", "", "Cabo Pulmo"] });
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
  assert.deepEqual(appels[0].champs.model, ["gpt-transcribe"]);
  assert.deepEqual(appels[0].champs.language, ["fr"]);
  assert.match(appels[0].champs.prompt[0], /Creel/);
  assert.equal(appels[0].champs.file[0].name, "enregistrement.mp4");
});

test("indices refusés par le service : on retente sans, l'enregistrement n'est pas perdu", async () => {
  const { appels, fetchImpl } = fauxService([
    { status: 422, corps: { message: "context_bias invalide" } },
    { status: 200, corps: { text: "transcrit" } },
  ]);
  assert.equal((await transcrireAudio(son(), { env: { MISTRAL_API_KEY: "k" }, fetchImpl, indices: ["Creel"] })).texte, "transcrit");
  assert.equal(appels.length, 2);
  assert.equal(appels[1].champs.context_bias, undefined);
});

test("modèle récent indisponible pour ce compte : repli sur gpt-4o-transcribe", async () => {
  const { appels, fetchImpl } = fauxService([
    { status: 404, corps: { error: { message: "The model `gpt-transcribe` does not exist or you do not have access to it." } } },
    { status: 200, corps: { text: "repli" } },
  ]);
  assert.equal((await transcrireAudio(son(), { env: { OPENAI_API_KEY: "k" }, fetchImpl, indices: ["Creel"] })).texte, "repli");
  assert.deepEqual(appels.map((a) => a.champs.model[0]), ["gpt-transcribe", "gpt-4o-transcribe"]);
  assert.match(appels[1].champs.prompt[0], /Creel/);
});

test("Groq : Whisper large v3 gratuit, prompt court", async () => {
  assert.equal(fournisseurTranscription({ GROQ_API_KEY: "g", MISTRAL_API_KEY: "m" }).nom, "groq");
  assert.equal(fournisseurTranscription({ GROQ_API_KEY: "g", OPENAI_API_KEY: "o" }).nom, "openai");
  const { appels, fetchImpl } = fauxService([{ status: 200, corps: { text: "gratuit" } }]);
  const indices = Array.from({ length: 80 }, (_, i) => `Lieu ${i}`);
  assert.equal((await transcrireAudio(son(), { env: { GROQ_API_KEY: "g" }, fetchImpl, indices })).texte, "gratuit");
  assert.deepEqual(appels[0].champs.response_format, ["verbose_json"]);
  assert.equal(appels[0].url, "https://api.groq.com/openai/v1/audio/transcriptions");
  assert.deepEqual(appels[0].champs.model, ["whisper-large-v3"]);
  assert.deepEqual(appels[0].champs.language, ["fr"]);
  assert.ok(appels[0].champs.prompt[0].length < 400, "prompt court pour Whisper");
});

test("une clé refusée remonte telle quelle, sans seconde tentative", async () => {
  const { appels, fetchImpl } = fauxService([{ status: 401, corps: { error: { message: "Invalid API key" } } }]);
  await assert.rejects(transcrireAudio(son(), { env: { OPENAI_API_KEY: "k" }, fetchImpl, indices: ["x"] }), /Invalid API key/);
  assert.equal(appels.length, 1);
});

test("les passages non transcrits se voient dans les segments", () => {
  const segs = (...p) => p.map(([start, end]) => ({ start, end, text: "x" }));
  assert.deepEqual(trousTranscription(segs([0, 10], [12, 40]), 45), []);
  assert.deepEqual(trousTranscription(segs([70, 90], [91, 120]), 125), [{ debut: 0, fin: 70 }], "début sauté");
  assert.deepEqual(trousTranscription(segs([0, 30], [80, 100]), 100), [{ debut: 30, fin: 80 }], "passage sauté au milieu");
  assert.deepEqual(trousTranscription(segs([0, 30]), 90), [{ debut: 30, fin: 90 }], "fin sautée");
  assert.deepEqual(trousTranscription([], 60), [{ debut: 0, fin: 60 }], "rien transcrit");
  assert.deepEqual(trousTranscription(undefined, 60), [], "service sans segments");
});

test("début sauté avec les indices : on retente sans et on garde le plus complet", async () => {
  const { appels, fetchImpl } = fauxService([
    { status: 200, corps: { text: "la fin", duration: 120, segments: [{ start: 70, end: 118, text: "la fin" }] } },
    { status: 200, corps: { text: "le début et la fin", duration: 120, segments: [{ start: 1, end: 60, text: "le début" }, { start: 62, end: 118, text: "et la fin" }] } },
  ]);
  const r = await transcrireAudio(son(), { env: { GROQ_API_KEY: "g" }, fetchImpl, indices: ["Izamal"] });
  assert.equal(appels.length, 2);
  assert.ok(appels[0].champs.prompt && !appels[1].champs.prompt);
  assert.equal(r.texte, "le début et la fin");
  assert.deepEqual(r.trous, []);
  assert.equal(r.duree, 120);
});

test("si la seconde tentative n'est pas meilleure, la première reste, avec son trou signalé", async () => {
  const { fetchImpl } = fauxService([
    { status: 200, corps: { text: "la fin", duration: 120, segments: [{ start: 70, end: 118, text: "la fin" }] } },
    { status: 200, corps: { text: "rien", duration: 120, segments: [] } },
  ]);
  const r = await transcrireAudio(son(), { env: { GROQ_API_KEY: "g" }, fetchImpl, indices: ["Izamal"] });
  assert.equal(r.texte, "la fin");
  assert.deepEqual(r.trous, [{ debut: 0, fin: 70 }]);
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
