import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function POST(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const date = form.get("date") || "misc";
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const db = supabaseAdmin();
  const ext = (file.name || "photo.jpg").split(".").pop();
  const path = `${date}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage.from("photos").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = db.storage.from("photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
