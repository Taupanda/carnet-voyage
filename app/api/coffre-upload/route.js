import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

const ALLOWED = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
const MAX_SIZE = 20 * 1024 * 1024; // 20 Mo

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const contentType = file.type || "";
  const ext = ALLOWED[contentType];
  if (!ext) {
    return NextResponse.json(
      { error: `type non autorisé: ${contentType || "inconnu"} (PDF, JPG, PNG, WEBP)` },
      { status: 415 }
    );
  }
  if (typeof file.size === "number" && file.size > MAX_SIZE) {
    return NextResponse.json({ error: "fichier trop volumineux (max 20 Mo)" }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_SIZE) {
    return NextResponse.json({ error: "fichier trop volumineux (max 20 Mo)" }, { status: 413 });
  }

  const db = supabaseAdmin();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from("coffre").upload(path, buf, { contentType, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const displayName = String(file.name || `doc.${ext}`).replace(/[\r\n]/g, "").slice(0, 80);
  return NextResponse.json({ path, name: displayName, type: contentType });
}
