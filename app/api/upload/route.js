import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

// Types d'images autorisés → extension canonique (on ne fait jamais confiance
// au nom de fichier fourni par le client pour dériver l'extension).
const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};
const MAX_SIZE = 15 * 1024 * 1024; // 15 Mo

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const rawDate = form.get("date") || "misc";
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const contentType = file.type || "";
  const ext = ALLOWED[contentType];
  if (!ext) {
    return NextResponse.json(
      { error: `type de fichier non autorisé: ${contentType || "inconnu"}` },
      { status: 415 }
    );
  }
  if (typeof file.size === "number" && file.size > MAX_SIZE) {
    return NextResponse.json({ error: "fichier trop volumineux (max 15 Mo)" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_SIZE) {
    return NextResponse.json({ error: "fichier trop volumineux (max 15 Mo)" }, { status: 413 });
  }

  // Segment de dossier assaini (évite l'injection de chemin via `date`).
  const date = String(rawDate).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "misc";

  const db = supabaseAdmin();
  const path = `${date}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await db.storage.from("photos").upload(path, buf, {
    contentType,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = db.storage.from("photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
