// Transcription d'un enregistrement, côté serveur.
//
// La dictée en direct du navigateur coupait à chaque extinction d'écran et
// devinait les mots au fil de l'eau, sans le contexte de la phrase entière.
// On enregistre d'abord, on transcrit ensuite, d'un bloc : le modèle entend
// toute la phrase avant de décider de chaque mot.
//
// Claude ne prend pas de son en entrée : la transcription passe par un service
// dédié, selon la clé présente dans Vercel — une seule suffit. Par ordre de
// préférence : OpenAI (payant, le plus juste), Groq (Whisper, gratuit), puis
// Mistral (Voxtral, qui à l'essai transcrivait trop mal la voix de l'auteur).

export const TAILLE_MAX = 25 * 1024 * 1024; // limite d'OpenAI, la plus stricte
const MAX_INDICES = 100;

// Extension attendue par le service : il reconnaît le format au nom du fichier.
export function extensionAudio(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("webm")) return "webm";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("mp4") || t.includes("m4a") || t.includes("aac")) return "mp4";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  if (t.includes("wav")) return "wav";
  return null;
}

export function fournisseurTranscription(env = process.env) {
  if (env.OPENAI_API_KEY) {
    // Le modèle le plus récent d'abord ; s'il n'est pas ouvert à ce compte, on
    // retombe sur gpt-4o-transcribe. OPENAI_TRANSCRIPTION_MODEL impose un choix.
    const impose = String(env.OPENAI_TRANSCRIPTION_MODEL || "").trim();
    return { nom: "openai", cle: env.OPENAI_API_KEY, modeles: impose ? [impose] : ["gpt-transcribe", "gpt-4o-transcribe"] };
  }
  // Gratuit dans les limites de Groq (plusieurs heures de son par jour) :
  // Whisper large v3, le modèle complet, plus juste en français que « turbo ».
  if (env.GROQ_API_KEY) return { nom: "groq", cle: env.GROQ_API_KEY, modeles: ["whisper-large-v3"] };
  if (env.MISTRAL_API_KEY) return { nom: "mistral", cle: env.MISTRAL_API_KEY, modeles: ["voxtral-mini-latest"] };
  return null;
}

// Les noms propres du voyage — villes, lieux, prénoms des rencontres — sont
// ceux que la reconnaissance écorche. On les souffle au modèle.
export function nettoyerIndices(liste) {
  const vus = new Set();
  const out = [];
  for (const brut of Array.isArray(liste) ? liste : []) {
    const mot = String(brut || "").replace(/\s+/g, " ").trim().slice(0, 60);
    const cle = mot.toLowerCase();
    if (!mot || vus.has(cle)) continue;
    vus.add(cle);
    out.push(mot);
    if (out.length >= MAX_INDICES) break;
  }
  return out;
}

async function lireErreur(res) {
  const corps = await res.text().catch(() => "");
  try {
    const j = JSON.parse(corps);
    const m = j?.error?.message || j?.message || j?.detail;
    if (m) return typeof m === "string" ? m : JSON.stringify(m);
  } catch {}
  return corps.slice(0, 200) || `erreur ${res.status}`;
}

function formulaire(fournisseur, modele, fichier, nom, indices, avecIndices) {
  const f = new FormData();
  f.append("file", fichier, nom);
  f.append("language", "fr");
  f.append("model", modele);
  if (fournisseur.nom === "mistral") {
    if (avecIndices) for (const mot of indices) f.append("context_bias", mot);
  } else if (fournisseur.nom === "groq") {
    // Whisper ne lit que les ~220 derniers jetons de son prompt, et le prend
    // comme le début du texte : une courte phrase dans le style attendu.
    if (avecIndices && indices.length) f.append("prompt", `Carnet de voyage au Mexique. ${indices.slice(0, 25).join(", ")}.`);
  } else if (avecIndices && indices.length) {
    f.append("prompt", `Carnet de voyage dicté en français par un voyageur au Mexique et en Amérique centrale ; noms de lieux et de plats souvent en espagnol. Noms propres possibles : ${indices.join(", ")}.`);
  }
  return f;
}

const erreurDeModele = (status, motif) => (status === 400 || status === 404) && /model/i.test(motif);

const URLS = {
  mistral: "https://api.mistral.ai/v1/audio/transcriptions",
  openai: "https://api.openai.com/v1/audio/transcriptions",
  groq: "https://api.groq.com/openai/v1/audio/transcriptions",
};

// `fichier` : un Blob. Rend le texte transcrit, ou lève une erreur lisible.
export async function transcrireAudio(fichier, { indices = [], env = process.env, fetchImpl = fetch } = {}) {
  const fournisseur = fournisseurTranscription(env);
  if (!fournisseur) {
    const e = new Error("transcription non configurée : ajoute GROQ_API_KEY (gratuit) ou OPENAI_API_KEY dans Vercel");
    e.status = 503;
    throw e;
  }
  const ext = extensionAudio(fichier?.type);
  if (!ext) {
    const e = new Error(`format audio non reconnu : ${fichier?.type || "inconnu"}`);
    e.status = 415;
    throw e;
  }
  const mots = nettoyerIndices(indices);

  // Les indices sont un bonus : si le service refuse la requête à cause
  // d'eux, on retente sans plutôt que de perdre l'enregistrement. Un modèle
  // inconnu de ce compte fait passer au suivant.
  let derniere = null;
  for (const modele of fournisseur.modeles) {
    for (const avecIndices of mots.length ? [true, false] : [false]) {
      const res = await fetchImpl(URLS[fournisseur.nom], {
        method: "POST",
        headers: { Authorization: `Bearer ${fournisseur.cle}` },
        body: formulaire(fournisseur, modele, fichier, `enregistrement.${ext}`, mots, avecIndices),
      });
      if (res.ok) {
        const j = await res.json();
        return String(j?.text ?? "").replace(/\s+/g, " ").trim();
      }
      const motif = await lireErreur(res);
      derniere = new Error(`${fournisseur.nom} : ${motif}`);
      derniere.status = res.status === 401 || res.status >= 500 ? 502 : res.status;
      if (erreurDeModele(res.status, motif)) break;
      if (avecIndices && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) continue;
      throw derniere;
    }
  }
  throw derniere || new Error("transcription impossible");
}
