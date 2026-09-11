import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export function supabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Les buckets `coffre` et `tickets` stockent le chemin du fichier à côté de la
// ligne, ce qui rend leur nettoyage direct. Le bucket `photos` ne stocke que
// l'URL publique (entries.photos, rencontres.photo_url) : il faut en réextraire
// le chemin pour pouvoir supprimer le fichier.
const PHOTOS_MARKER = "/storage/v1/object/public/photos/";

export function photoPathFromUrl(url) {
  if (typeof url !== "string" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  let parsed, projectHost;
  try {
    parsed = new URL(url);
    projectHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;
  } catch {
    return null;
  }
  // Une URL qui ne pointe pas vers notre bucket (lien externe, champ saisi à la
  // main) est ignorée : on ne tente jamais de supprimer ce qui ne nous appartient pas.
  if (parsed.host !== projectHost) return null;
  const i = parsed.pathname.indexOf(PHOTOS_MARKER);
  if (i === -1) return null;
  return decodeURIComponent(parsed.pathname.slice(i + PHOTOS_MARKER.length)) || null;
}

// Suppression best-effort des fichiers du bucket `photos`.
//
// Chaque upload écrit un chemin neuf et aléatoire (voir app/api/upload/route.js,
// `upsert: false`), donc une URL n'est référencée que par une seule ligne : la
// supprimer ne peut pas casser l'affichage d'un autre post ou d'une autre rencontre.
//
// Ne renvoie jamais d'erreur : la ligne est déjà supprimée à ce stade, et un
// fichier resté orphelin vaut mieux qu'un échec affiché à tort à l'utilisateur.
export async function removePhotos(urls) {
  const paths = [...new Set((urls || []).map(photoPathFromUrl).filter(Boolean))];
  if (!paths.length) return;
  try {
    await supabaseAdmin().storage.from("photos").remove(paths);
  } catch {}
}

// Comparaison à temps constant : évite les timing attacks sur les secrets.
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// L'utilisateur derrière une requête, ou null. checkAdmin ne répond qu'à « est-ce
// l'auteur » ; ici on a besoin de savoir QUI, pour rattacher un abonnement.
export async function utilisateurDeLaRequete(request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const { data, error } = await supabaseAdmin().auth.getUser(auth.slice(7));
    return error ? null : data.user || null;
  } catch {
    return null;
  }
}

export async function checkAdmin(request) {
  // Voie 1 : session Supabase de l'admin (compte Google)
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && process.env.ADMIN_EMAIL) {
    try {
      const token = auth.slice(7);
      const { data, error } = await supabaseAdmin().auth.getUser(token);
      if (
        !error &&
        data.user?.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
      ) {
        return true;
      }
    } catch (e) {}
  }
  // Voie 2 (secours) : ancien mot de passe
  const key = request.headers.get("x-admin-key");
  if (key && process.env.ADMIN_PASSWORD && safeEqual(key, process.env.ADMIN_PASSWORD)) {
    return true;
  }
  return false;
}

// Extrait le JSON d'une réponse du modèle, même si elle contient un préambule,
// des fences markdown ou du texte parasite autour de l'objet.
export function extractJson(raw) {
  const cleaned = (raw || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Réponse IA non exploitable (JSON introuvable).");
  }
}

export async function callClaude(system, messages, maxTokens = 1500) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: maxTokens,
      // Pas de réflexion étendue : on veut une génération JSON rapide et le même
      // budget de tokens qu'avant (sinon max_tokens serait partagé avec le thinking).
      thinking: { type: "disabled" },
      system,
      messages,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${t}`);
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}
