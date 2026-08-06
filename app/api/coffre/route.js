import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

const SIGN_TTL = 3600; // URLs signées valables 1 h

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db.from("coffre_docs").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const r of data || []) {
    const files = Array.isArray(r.fichiers) ? r.fichiers : [];
    for (const f of files) {
      if (!f?.path) continue;
      const { data: signed } = await db.storage.from("coffre").createSignedUrl(f.path, SIGN_TTL);
      f.url = signed?.signedUrl || null;
    }
  }
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  if (!body.titre || !String(body.titre).trim()) {
    return NextResponse.json({ error: "titre requis" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const row = {
    ...(body.id ? { id: body.id } : {}),
    categorie: ["passeport", "assurance", "sante", "contact", "autre"].includes(body.categorie) ? body.categorie : "autre",
    titre: String(body.titre).trim(),
    notes: body.notes || null,
    fichiers: Array.isArray(body.fichiers) ? body.fichiers : [],
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db.from("coffre_docs").upsert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  const db = supabaseAdmin();
  const { data: row } = await db.from("coffre_docs").select("fichiers").eq("id", id).single();
  const paths = (row?.fichiers || []).map((f) => f?.path).filter(Boolean);
  if (paths.length) await db.storage.from("coffre").remove(paths);
  const { error } = await db.from("coffre_docs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
