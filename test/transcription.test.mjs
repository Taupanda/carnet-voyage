// Enregistrer, puis transcrire : un seul service (ElevenLabs Scribe v3), le
// français avec l'espagnol en seconde langue, les noms propres soufflés, le
// repli quand ces options gênent, et les passages sautés repérés.
import test from "node:test";
import assert from "node:assert/strict";
import { transcrireAudio, extensionAudio, nettoyerIndices, trousTranscription, MODELE } from "../lib/transcription.js";
import { ajouterTexte, dureeLisible } from "../lib/enregistreur.js";

const son = (type = "audio/webm;codecs=opus") => new Blob([new Uint8Array([1, 2, 3])], { type });
const ENV = { ELEVENLABS_API_KEY: "cle" };

function fauxService(reponses) {
  const appels = [];
  const fetchImpl = async (url, init) => {
    const champs = {};
    for (const [k, v] of init.body.entries()) (champs[k] ||= []).push(v);
    appels.push({ url, cle: init.headers["xi-api-key"], champs });
    const r = reponses[Math.min(appels.length - 1, reponses.length - 1)];
    return new Response(JSON.stringify(r.corps), { status: r.status });
  };
  return { appels, fetchImpl };
}

const mot = (text, start, end) => ({ text, start, end, type: "word" });

test("sans clé, un message qui dit quoi ajouter", async () => {
  await assert.rejects(transcrireAudio(son(), { env: {} }), (e) => e.status === 503 && /ELEVENLABS_API_KEY/.test(e.message));
});

test("les formats des téléphones sont reconnus", () => {
  assert.equal(extensionAudio("audio/webm;codecs=opus"), "webm"); // Android
  assert.equal(extensionAudio("audio/mp4"), "mp4");               // iPhone
  assert.equal(extensionAudio("audio/ogg;codecs=opus"), "ogg");
  assert.equal(extensionAudio("image/png"), null);
});

test("Scribe v3 : français, espagnol en seconde langue, noms propres en keyterms", async () => {
  const { appels, fetchImpl } = fauxService([{ status: 200, corps: {
    text: "  On est allés à  Izamal. ", audio_duration_secs: 4,
    words: [mot("On", 0.1, 0.3), { text: " ", start: 0.3, end: 0.35, type: "spacing" }, mot("Izamal.", 2, 3)],
  } }]);
  const r = await transcrireAudio(son(), { env: ENV, fetchImpl, indices: ["Izamal", "izamal", "", "Itzel"] });
  assert.deepEqual(r, { texte: "On est allés à Izamal.", trous: [], duree: 4 });
  assert.equal(appels.length, 1);
  assert.equal(appels[0].url, "https://api.elevenlabs.io/v1/speech-to-text");
  assert.equal(appels[0].cle, "cle");
  const c = appels[0].champs;
  assert.deepEqual(c.model_id, [MODELE]);
  assert.equal(MODELE, "scribe_v3");
  assert.deepEqual(c.language_code, ["fr"]);
  assert.deepEqual(c.secondary_language_codes, ["es"]);
  assert.deepEqual(c.keyterms, ["Izamal", "Itzel"]);
  assert.deepEqual(c.tag_audio_events, ["false"]);
  assert.equal(c.file[0].name, "enregistrement.webm");
});

test("options refusées par le service : on retente sans, le son n'est pas perdu", async () => {
  const { appels, fetchImpl } = fauxService([
    { status: 422, corps: { detail: { message: "invalid_parameters: keyterms" } } },
    { status: 200, corps: { text: "transcrit", words: [] } },
  ]);
  assert.equal((await transcrireAudio(son("audio/mp4"), { env: ENV, fetchImpl, indices: ["Creel"] })).texte, "transcrit");
  assert.equal(appels.length, 2);
  assert.equal(appels[1].champs.keyterms, undefined);
  assert.equal(appels[1].champs.secondary_language_codes, undefined);
  assert.equal(appels[1].champs.file[0].name, "enregistrement.mp4");
});

test("clé refusée ou quota épuisé : l'erreur remonte, sans seconde tentative", async () => {
  for (const status of [401, 402, 429]) {
    const { appels, fetchImpl } = fauxService([{ status, corps: { detail: { message: `refus ${status}` } } }]);
    await assert.rejects(transcrireAudio(son(), { env: ENV, fetchImpl, indices: ["x"] }), new RegExp(`ElevenLabs : refus ${status}`));
    assert.equal(appels.length, 1);
  }
});

test("un début sauté se voit dans les horodatages des mots", async () => {
  const { fetchImpl } = fauxService([{ status: 200, corps: {
    text: "la fin", audio_duration_secs: 120, words: [mot("la", 70, 70.5), mot("fin", 70.6, 118)],
  } }]);
  const r = await transcrireAudio(son(), { env: ENV, fetchImpl });
  assert.deepEqual(r.trous, [{ debut: 0, fin: 70 }]);
});

test("les passages non transcrits, au début, au milieu, à la fin", () => {
  const segs = (...p) => p.map(([start, end]) => ({ start, end, text: "x" }));
  assert.deepEqual(trousTranscription(segs([0, 10], [12, 40]), 45), []);
  assert.deepEqual(trousTranscription(segs([70, 90], [91, 120]), 125), [{ debut: 0, fin: 70 }]);
  assert.deepEqual(trousTranscription(segs([0, 30], [80, 100]), 100), [{ debut: 30, fin: 80 }]);
  assert.deepEqual(trousTranscription(segs([0, 30]), 90), [{ debut: 30, fin: 90 }]);
  assert.deepEqual(trousTranscription([], 60), [{ debut: 0, fin: 60 }]);
  assert.deepEqual(trousTranscription(undefined, 60), []);
});

test("noms propres : cent au plus, sans doublon, ni trop longs", () => {
  const l = nettoyerIndices([...Array.from({ length: 150 }, (_, i) => `Lieu ${i}`), "Lieu 3", "un nom bien trop long en six mots", "x".repeat(51)]);
  assert.equal(l.length, 100);
  assert.equal(new Set(l).size, 100);
  assert.deepEqual(nettoyerIndices(["Oaxaca & Día de Muertos", "un nom bien trop long en six mots"]), ["Oaxaca & Día de Muertos"]);
});

test("le texte transcrit s'ajoute à ce qui est déjà écrit", () => {
  assert.equal(ajouterTexte("", "Bonjour."), "Bonjour.");
  assert.equal(ajouterTexte("J'ai vu ", " la mer."), "J'ai vu la mer.");
  assert.equal(ajouterTexte("Déjà là", "  "), "Déjà là");
  assert.equal(dureeLisible(83), "1:23");
});
