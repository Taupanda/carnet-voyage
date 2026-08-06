import { NextResponse } from "next/server";
import { safeEqual } from "../../../lib/server";

// Rate-limiting best-effort en mémoire (par instance serverless). Ralentit
// fortement un bruteforce sans dépendance externe. Pour une garantie stricte
// multi-instances, il faudrait un store partagé (Upstash/Redis).
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const attempts = new Map(); // ip -> { count, first }

function rateLimited(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, reason: "Trop de tentatives. Réessaie dans une minute." },
      { status: 429 }
    );
  }

  const { password } = await request.json();

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, reason: "ADMIN_PASSWORD n'est pas configuré sur Vercel (ou pas redéployé)." },
      { status: 500 }
    );
  }
  if (!safeEqual(password || "", process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ ok: false, reason: "Mot de passe incorrect." }, { status: 401 });
  }

  // check other critical env vars to give early diagnostics
  const missing = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");

  return NextResponse.json({ ok: true, missingVars: missing });
}
