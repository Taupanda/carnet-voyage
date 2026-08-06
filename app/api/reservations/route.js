import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

const SIGN_TTL = 3600; // URLs signées valables 1 h

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("reservations")
    .select("*")
    .order("date_debut", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Génère une URL signée temporaire pour chaque billet.
  for (const r of data || []) {
    const files = Array.isArray(r.fichiers) ? r.fichiers : [];
    for (const f of files) {
      if (!f?.path) continue;
      const { data: signed } = await db.storage.from("tickets").createSignedUrl(f.path, SIGN_TTL);
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
    type: ["hotel", "transport", "autre"].includes(body.type) ? body.type : "hotel",
    titre: String(body.titre).trim(),
    lieu: body.lieu || null,
    date_debut: body.date_debut || null,
    date_fin: body.date_fin || null,
    plateforme_url: body.plateforme_url || null,
    notes: body.notes || null,
    fichiers: Array.isArray(body.fichiers) ? body.fichiers : [],
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db.from("reservations").upsert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  const db = supabaseAdmin();
  // Supprime d'abord les billets du bucket privé.
  const { data: row } = await db.from("reservations").select("fichiers").eq("id", id).single();
  const paths = (row?.fichiers || []).map((f) => f?.path).filter(Boolean);
  if (paths.length) await db.storage.from("tickets").remove(paths);
  const { error } = await db.from("reservations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
