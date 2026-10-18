// Transcription d'un enregistrement, côté serveur.
//
// La dictée en direct du navigateur coupait à chaque extinction d'écran et
// devinait les mots au fil de l'eau, sans le contexte de la phrase entière.
// On enregistre d'abord, on transcrit ensuite, d'un bloc : le modèle entend
// toute la phrase avant de décider de chaque mot.
//
// Claude ne prend pas de son en entrée : la transcription passe par un service
// dédié. Mistral (Voxtral) ou OpenAI, selon la clé présente dans Vercel — une
// seule suffit, Mistral est préféré quand les deux existent (moins cher, très
// bon en français).

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
  if (env.MISTRAL_API_KEY) return { nom: "mistral", cle: env.MISTRAL_API_KEY };
  if (env.OPENAI_API_KEY) return { nom: "openai", cle: env.OPENAI_API_KEY };
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

function formulaire(fournisseur, fichier, nom, indices, avecIndices) {
  const f = new FormData();
  f.append("file", fichier, nom);
  f.append("language", "fr");
  if (fournisseur.nom === "mistral") {
    f.append("model", "voxtral-mini-latest");
    if (avecIndices) for (const mot of indices) f.append("context_bias", mot);
  } else {
    f.append("model", "gpt-4o-transcribe");
    if (avecIndices && indices.length) {
      f.append("prompt", `Carnet de voyage dicté en français, au Mexique et en Amérique centrale. Noms propres possibles : ${indices.join(", ")}.`);
    }
  }
  return f;
}

const URLS = {
  mistral: "https://api.mistral.ai/v1/audio/transcriptions",
  openai: "https://api.openai.com/v1/audio/transcriptions",
};

// `fichier` : un Blob. Rend le texte transcrit, ou lève une erreur lisible.
export async function transcrireAudio(fichier, { indices = [], env = process.env, fetchImpl = fetch } = {}) {
  const fournisseur = fournisseurTranscription(env);
  if (!fournisseur) {
    const e = new Error("transcription non configurée : ajoute MISTRAL_API_KEY (ou OPENAI_API_KEY) dans Vercel");
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
  // d'eux, on retente sans plutôt que de perdre l'enregistrement.
  for (const avecIndices of mots.length ? [true, false] : [false]) {
    const res = await fetchImpl(URLS[fournisseur.nom], {
      method: "POST",
      headers: { Authorization: `Bearer ${fournisseur.cle}` },
      body: formulaire(fournisseur, fichier, `enregistrement.${ext}`, mots, avecIndices),
    });
    if (res.ok) {
      const j = await res.json();
      return String(j?.text ?? "").replace(/\s+/g, " ").trim();
    }
    const motif = await lireErreur(res);
    if (avecIndices && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) continue;
    const e = new Error(`${fournisseur.nom} : ${motif}`);
    e.status = res.status === 401 ? 502 : res.status >= 500 ? 502 : res.status;
    throw e;
  }
  throw new Error("transcription impossible");
}
