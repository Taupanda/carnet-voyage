import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

// GET public : liste des rencontres SANS le champ privé "reseaux"
// GET admin (avec token) : tout, réseaux inclus
export async function GET(request) {
  const isAdmin = await checkAdmin(request);
  // lecture via service_role (RLS active sans policy publique), on filtre le privé pour le public
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("rencontres")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = isAdmin ? data : (data || []).map(({ reseaux, ...r }) => r);
  return NextResponse.json(rows || []);
}

// POST admin : créer ou mettre à jour une rencontre
export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const db = supabaseAdmin();
  const payload = {
    prenom: body.prenom,
    nom: body.nom || null,
    photo_url: body.photo_url || null,
    pays: body.pays || null,
    lieu_rencontre: body.lieu_rencontre || null,
    activites: body.activites || null,
    anecdote: body.anecdote || null,
    reseaux: body.reseaux || null,
  };
  if (body.id) payload.id = body.id;

  const { data, error } = await db.from("rencontres").upsert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE admin
export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  const db = supabaseAdmin();
  const { error } = await db.from("rencontres").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
