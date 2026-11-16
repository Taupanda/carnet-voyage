// Transcription d'un enregistrement, côté serveur.
//
// La dictée en direct du navigateur coupait à chaque extinction d'écran et
// devinait les mots au fil de l'eau, sans le contexte de la phrase entière.
// On enregistre d'abord, on transcrit ensuite, d'un bloc : le modèle entend
// toute la phrase avant de décider de chaque mot.
//
// Claude ne prend pas de son en entrée : la transcription passe par un service
// dédié, et un seul. Mistral (Voxtral) puis Groq (Whisper) ont été essayés :
// la qualité variait d'un enregistrement à l'autre, surtout dès qu'il mêle de
// l'espagnol au français (lieux, plats, prénoms), et Whisper sautait parfois
// des passages entiers. ElevenLabs Scribe v3 est en tête des classements
// indépendants, et c'est le seul à accepter une seconde langue attendue
// (l'espagnol) en plus du français, et une liste de noms propres à repérer.

export const TAILLE_MAX = 25 * 1024 * 1024; // bien en deçà de la limite d'ElevenLabs
export const MODELE = "scribe_v3";
const URL_STT = "https://api.elevenlabs.io/v1/speech-to-text";
const MAX_INDICES = 100;

// Le format du son, deviné du nom du fichier par le service.
export function extensionAudio(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("webm")) return "webm";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("mp4") || t.includes("m4a") || t.includes("aac")) return "mp4";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  if (t.includes("wav")) return "wav";
  return null;
}

// Les noms propres du voyage — villes, lieux, prénoms des rencontres — sont
// ceux que la reconnaissance écorche. On les souffle au modèle : au plus cent,
// chacun de 50 caractères et 5 mots au plus (limites d'ElevenLabs).
export function nettoyerIndices(liste) {
  const vus = new Set();
  const out = [];
  for (const brut of Array.isArray(liste) ? liste : []) {
    const mot = String(brut || "").replace(/\s+/g, " ").trim();
    const cle = mot.toLowerCase();
    if (!mot || mot.length > 50 || mot.split(" ").length > 5 || vus.has(cle)) continue;
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
    const m = j?.detail?.message || j?.detail || j?.error?.message || j?.message;
    if (m) return typeof m === "string" ? m : JSON.stringify(m);
  } catch {}
  return corps.slice(0, 200) || `erreur ${res.status}`;
}

function formulaire(fichier, nom, indices, complet) {
  const f = new FormData();
  f.append("file", fichier, nom);
  f.append("model_id", MODELE);
  f.append("language_code", "fr");
  f.append("tag_audio_events", "false"); // pas de « (rires) » dans le carnet
  f.append("timestamps_granularity", "word");
  if (complet) {
    // Il parle français, mais les lieux, les plats et les gens sont souvent
    // espagnols : c'est là que les transcriptions déraillaient.
    f.append("secondary_language_codes", "es");
    for (const mot of indices) f.append("keyterms", mot);
  }
  return f;
}

// Un service peut sauter des passages entiers d'un long enregistrement — le
// début surtout — sans rien signaler. Les horodatages des mots le trahissent :
// un long blanc avant le premier mot, ou entre deux mots, est un passage qui
// n'a pas été transcrit (ou un long silence). Rend les trous d'au moins
// `seuil` secondes, en secondes entières.
export const SEUIL_TROU_S = 20;
export function trousTranscription(segments, duree, seuil = SEUIL_TROU_S) {
  if (!Array.isArray(segments)) return [];
  const segs = segments
    .filter((x) => Number.isFinite(Number(x?.start)) && Number.isFinite(Number(x?.end)) && String(x?.text || "").trim())
    .map((x) => ({ start: Number(x.start), end: Number(x.end) }))
    .sort((a, b) => a.start - b.start);
  const total = Number(duree);
  if (!segs.length) return Number.isFinite(total) && total >= seuil ? [{ debut: 0, fin: Math.round(total) }] : [];
  const trous = [];
  let curseur = 0;
  for (const sg of segs) {
    if (sg.start - curseur >= seuil) trous.push({ debut: Math.round(curseur), fin: Math.round(sg.start) });
    curseur = Math.max(curseur, sg.end);
  }
  if (Number.isFinite(total) && total - curseur >= seuil) trous.push({ debut: Math.round(curseur), fin: Math.round(total) });
  return trous;
}

// `fichier` : un Blob. Rend { texte, trous, duree } — trous : les passages
// que le service n'a pas transcrits —, ou lève une erreur lisible.
export async function transcrireAudio(fichier, { indices = [], env = process.env, fetchImpl = fetch } = {}) {
  const cle = env.ELEVENLABS_API_KEY;
  if (!cle) {
    const e = new Error("transcription non configurée : ajoute ELEVENLABS_API_KEY dans Vercel");
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

  // L'espagnol et les noms propres sont un bonus : si le service refuse la
  // requête à cause d'eux, on retente sans plutôt que de perdre le son.
  let derniere = null;
  for (const complet of [true, false]) {
    const res = await fetchImpl(URL_STT, {
      method: "POST",
      headers: { "xi-api-key": cle },
      body: formulaire(fichier, `enregistrement.${ext}`, mots, complet),
    });
    if (res.ok) {
      const j = await res.json();
      const motsHorodates = (Array.isArray(j?.words) ? j.words : []).filter((w) => w?.type === "word");
      const duree = Number.isFinite(Number(j?.audio_duration_secs)) ? Number(j.audio_duration_secs) : null;
      return {
        texte: String(j?.text ?? "").replace(/\s+/g, " ").trim(),
        trous: Array.isArray(j?.words) ? trousTranscription(motsHorodates, duree) : [],
        duree: duree == null ? null : Math.round(duree),
      };
    }
    const motif = await lireErreur(res);
    derniere = new Error(`ElevenLabs : ${motif}`);
    derniere.status = res.status === 401 || res.status >= 500 ? 502 : res.status;
    const refusDesOptions = complet && res.status >= 400 && res.status < 500 && ![401, 402, 403, 429].includes(res.status);
    if (!refusDesOptions) throw derniere;
  }
  throw derniere;
}
