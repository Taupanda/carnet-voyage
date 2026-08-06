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

// Comparaison à temps constant : évite les timing attacks sur les secrets.
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
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
