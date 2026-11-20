// Relecture d'une transcription par Claude, avant qu'elle n'arrive à l'écran.
//
// Même le meilleur service de transcription écorche ce qu'il n'a jamais
// entendu : un village maya, un plat oaxaqueño, le prénom d'une rencontre, ou
// un homophone que seul le sens tranche (« verre » / « vert »). Claude connaît
// le contexte du voyage et corrige ces mots-là — et rien d'autre : ni style,
// ni ponctuation réinventée, ni phrase ajoutée.
//
// Garde-fou : une « correction » qui change trop de mots n'en est plus une.
// On garde alors le texte d'origine.

const SYSTEME = (indices) => `Tu relis la transcription automatique d'un message vocal dicté en français par un voyageur, pendant un voyage au Mexique et en Amérique centrale. Les noms de lieux, de plats et de personnes sont souvent espagnols ou mayas.

Ta seule tâche : corriger les mots MANIFESTEMENT mal transcrits — noms propres écorchés, homophones absurdes dans le contexte, mot espagnol transcrit comme du français approchant, mot coupé en deux.
- Ne change rien d'autre : ni les tournures, ni le niveau de langue, ni l'ordre, ni les hésitations utiles au sens. Un mot plausible reste tel quel, même maladroit.
- N'ajoute aucun mot, aucune phrase, aucune explication. Ne supprime rien, sauf un mot répété par erreur de transcription.
- Ponctuation : rétablis seulement les points et virgules nécessaires à la lecture.
- Dans le doute, laisse le mot d'origine.
${indices.length ? `\nNoms propres du voyage (orthographe correcte) : ${indices.join(", ")}.\n` : ""}
Réponds UNIQUEMENT par le texte corrigé, sans guillemets ni commentaire.`;

const mots = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]+/g) || [];

// Part des mots du texte d'origine qui ne se retrouvent plus, à leur place,
// dans le texte corrigé (distance d'édition sur les mots, rapportée à leur
// nombre).
export function ecartMots(avant, apres) {
  const a = mots(avant), b = mots(apres);
  if (!a.length) return b.length ? 1 : 0;
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cour = [i];
    for (let j = 1; j <= b.length; j++) {
      cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prec = cour;
  }
  return prec[b.length] / a.length;
}

export const ECART_MAX = 0.2;

// callClaude : celui de lib/server.js (passé en argument pour les tests).
export async function corrigerTranscription(texte, { indices = [], callClaude }) {
  const brut = String(texte || "").trim();
  if (!brut) return { texte: brut, corrige: false };
  try {
    const nbMots = mots(brut).length;
    const sortie = await callClaude(SYSTEME(indices.slice(0, 80)), [{ role: "user", content: brut }], Math.min(12000, nbMots * 4 + 300));
    const corrige = String(sortie || "").trim().replace(/^["«]\s*|\s*["»]$/g, "");
    if (!corrige || ecartMots(brut, corrige) > ECART_MAX) return { texte: brut, corrige: false };
    return { texte: corrige, corrige: corrige !== brut };
  } catch {
    // Relecture indisponible : la transcription brute vaut mieux que rien.
    return { texte: brut, corrige: false };
  }
}
