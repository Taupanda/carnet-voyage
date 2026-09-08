import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

const LANGUES = ["fr", "es"];

// Normalise ce qui vient du client : on ne fait jamais confiance au corps brut.
function clean(v) {
  return typeof v === "string" ? v.trim() : "";
}
function cleanAlternatives(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map(clean).filter(Boolean))].slice(0, 6);
}

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("vocabulaire")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const fr = clean(body.fr);
  const es = clean(body.es);
  if (!fr || !es) {
    return NextResponse.json({ error: "les deux langues sont requises" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("vocabulaire")
    .insert({
      fr,
      es,
      source: LANGUES.includes(body.source) ? body.source : "fr",
      alternatives: cleanAlternatives(body.alternatives),
      note: clean(body.note) || null,
    })
    .select()
    .single();
  if (error) {
    // 23505 : l'index unique (lower(fr), lower(es)) a déjà cette paire.
    if (error.code === "23505") {
      return NextResponse.json({ error: "ce mot est déjà dans la liste" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id, ...fields } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const patch = { updated_at: new Date().toISOString() };
  if (typeof fields.fr === "string") {
    if (!clean(fields.fr)) return NextResponse.json({ error: "le mot français ne peut pas être vide" }, { status: 400 });
    patch.fr = clean(fields.fr);
  }
  if (typeof fields.es === "string") {
    if (!clean(fields.es)) return NextResponse.json({ error: "le mot espagnol ne peut pas être vide" }, { status: 400 });
    patch.es = clean(fields.es);
  }
  if (Array.isArray(fields.alternatives)) patch.alternatives = cleanAlternatives(fields.alternatives);
  if (typeof fields.note === "string") patch.note = clean(fields.note) || null;

  const db = supabaseAdmin();
  const { data, error } = await db.from("vocabulaire").update(patch).eq("id", id).select().single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "cette paire existe déjà dans la liste" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from("vocabulaire").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
