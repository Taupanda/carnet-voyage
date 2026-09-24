// La conversation avec l'assistant, gardée sur le téléphone au fil de l'eau.
//
// Elle ne vivait qu'en mémoire : un retour arrière, un rechargement ou un
// onglet fermé par le téléphone effaçait tout ce qui avait été raconté. Chaque
// échange est désormais écrit dans le stockage du navigateur, par jour, et
// effacé une fois le post enregistré.

const PREFIXE = "carnet-conversation-";
// Au-delà, une conversation jamais reprise n'a plus de raison d'encombrer.
const DUREE_MAX = 30 * 86400000;

const stockage = (s) => s ?? (typeof localStorage !== "undefined" ? localStorage : null);

// Ce qui mérite d'être gardé : au moins une chose dite ou en cours de saisie.
// Le message d'accueil de l'assistant seul ne vaut pas une sauvegarde — et ne
// doit surtout pas écraser une conversation précédente du même jour.
export function vautSauvegarde(b) {
  return !!b && ((b.messages || []).some((m) => m.role === "user") || !!String(b.input || "").trim());
}

export function sauverConversation(date, b, s) {
  const st = stockage(s);
  if (!st || !vautSauvegarde(b)) return;
  try {
    st.setItem(PREFIXE + date, JSON.stringify({
      date,
      messages: b.messages || [],
      extracted: b.extracted || null,
      input: b.input || "",
      photos: b.photos || [],
      le: Date.now(),
    }));
  } catch {}
}

export function lireConversation(date, s) {
  const st = stockage(s);
  if (!st) return null;
  try {
    const b = JSON.parse(st.getItem(PREFIXE + date) || "null");
    if (!vautSauvegarde(b)) return null;
    if (Date.now() - (b.le || 0) > DUREE_MAX) { st.removeItem(PREFIXE + date); return null; }
    return b;
  } catch {
    return null;
  }
}

export function effacerConversation(date, s) {
  try { stockage(s)?.removeItem(PREFIXE + date); } catch {}
}

// Toutes les conversations en attente, la plus récente d'abord.
export function conversationsEnCours(s) {
  const st = stockage(s);
  if (!st) return [];
  const out = [];
  try {
    for (let i = 0; i < st.length; i++) {
      const k = st.key(i);
      if (!k?.startsWith(PREFIXE)) continue;
      const b = lireConversation(k.slice(PREFIXE.length), st);
      if (b) out.push(b);
    }
  } catch {}
  return out.sort((a, b) => b.le - a.le);
}

// Ce qu'on affiche pour la reconnaître : combien de messages, et le début du
// dernier passage raconté.
export function apercuConversation(b) {
  const dits = (b?.messages || []).filter((m) => m.role === "user").map((m) => m.content);
  const dernier = String(b?.input || "").trim() || dits[dits.length - 1] || "";
  return {
    nombre: dits.length,
    extrait: dernier.length > 90 ? dernier.slice(0, 90).trim() + "…" : dernier,
  };
}
