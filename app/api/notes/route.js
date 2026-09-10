import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

const estUneDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const db = supabaseAdmin();
  let q = db
    .from("notes_jour")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: true });
  if (estUneDate(date)) q = q.eq("date", date);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const texte = typeof body.texte === "string" ? body.texte.trim() : "";
  if (!texte) return NextResponse.json({ error: "note vide" }, { status: 400 });
  if (!estUneDate(body.date)) return NextResponse.json({ error: "date invalide" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("notes_jour")
    .insert({ date: body.date, texte })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id, texte, utilisee, date } = await request.json();

  const db = supabaseAdmin();

  // Marquer d'un coup toutes les notes d'une journée comme utilisées, au moment
  // où le post part en ligne.
  if (!id && estUneDate(date) && typeof utilisee === "boolean") {
    const { error } = await db.from("notes_jour").update({ utilisee }).eq("date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const patch = {};
  if (typeof texte === "string") {
    if (!texte.trim()) return NextResponse.json({ error: "note vide" }, { status: 400 });
    patch.texte = texte.trim();
  }
  if (typeof utilisee === "boolean") patch.utilisee = utilisee;

  const { data, error } = await db.from("notes_jour").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from("notes_jour").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
