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
  if (key && process.env.ADMIN_PASSWORD && key === process.env.ADMIN_PASSWORD) {
    return true;
  }
  return false;
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
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
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
