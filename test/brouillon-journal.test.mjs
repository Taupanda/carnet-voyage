// Une conversation avec l'assistant ne doit plus disparaître sur un retour
// arrière : elle est gardée sur le téléphone jusqu'à l'enregistrement du post.
import test from "node:test";
import assert from "node:assert/strict";
import {
  sauverConversation, lireConversation, effacerConversation, conversationsEnCours, apercuConversation, vautSauvegarde,
} from "../lib/brouillonJournal.js";

// Un stockage à la manière de localStorage.
function faux() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

const accueil = { role: "assistant", content: "Alors, cette journée ?" };
const conversation = {
  messages: [accueil, { role: "user", content: "Bus de nuit jusqu'à Chihuahua." }, { role: "assistant", content: "Et ensuite ?" }],
  extracted: { lieux: ["Chihuahua"] },
  input: "Puis le transfert vers Creel, arrivé vers",
  photos: ["https://x/p1.jpg"],
};

test("une conversation entamée se retrouve telle quelle, champ en cours compris", () => {
  const s = faux();
  sauverConversation("2026-09-23", conversation, s);
  const b = lireConversation("2026-09-23", s);
  assert.deepEqual(b.messages, conversation.messages);
  assert.deepEqual(b.extracted, conversation.extracted);
  assert.equal(b.input, conversation.input);
  assert.deepEqual(b.photos, conversation.photos);
});

test("un texte dicté mais pas encore envoyé suffit à sauvegarder", () => {
  const s = faux();
  sauverConversation("2026-09-23", { messages: [accueil], input: "Longue histoire dictée…" }, s);
  assert.equal(lireConversation("2026-09-23", s).input, "Longue histoire dictée…");
});

test("relancer l'interview n'écrase pas la conversation précédente", () => {
  const s = faux();
  sauverConversation("2026-09-23", conversation, s);
  sauverConversation("2026-09-23", { messages: [accueil], input: "" }, s); // accueil seul
  assert.equal(lireConversation("2026-09-23", s).messages.length, 3);
  assert.equal(vautSauvegarde({ messages: [accueil], input: "  " }), false);
});

test("une conversation par jour, la plus récente en tête, effacée après enregistrement", () => {
  const s = faux();
  sauverConversation("2026-09-22", conversation, s);
  sauverConversation("2026-09-23", { ...conversation, input: "" }, s);
  s.setItem("carnet-derniers-outils", "[]"); // autre clé, ignorée
  const b22 = JSON.parse(s.getItem("carnet-conversation-2026-09-22"));
  s.setItem("carnet-conversation-2026-09-22", JSON.stringify({ ...b22, le: b22.le - 1000 }));
  assert.deepEqual(conversationsEnCours(s).map((b) => b.date), ["2026-09-23", "2026-09-22"]);
  effacerConversation("2026-09-23", s);
  assert.deepEqual(conversationsEnCours(s).map((b) => b.date), ["2026-09-22"]);
});

test("une conversation vieille d'un mois est oubliée", () => {
  const s = faux();
  s.setItem("carnet-conversation-2026-08-01", JSON.stringify({ ...conversation, date: "2026-08-01", le: Date.now() - 31 * 86400000 }));
  assert.equal(lireConversation("2026-08-01", s), null);
  assert.equal(s.getItem("carnet-conversation-2026-08-01"), null);
});

test("un stockage illisible ou indisponible ne fait rien planter", () => {
  const s = faux();
  s.setItem("carnet-conversation-2026-09-23", "{pas du json");
  assert.equal(lireConversation("2026-09-23", s), null);
  const plein = { ...faux(), setItem: () => { throw new Error("QuotaExceeded"); } };
  assert.doesNotThrow(() => sauverConversation("2026-09-23", conversation, plein));
});

test("l'aperçu donne le nombre de messages et le dernier passage", () => {
  assert.deepEqual(apercuConversation(conversation), { nombre: 1, extrait: "Puis le transfert vers Creel, arrivé vers" });
  assert.equal(apercuConversation({ messages: [{ role: "user", content: "x".repeat(120) }] }).extrait.length, 91);
});
