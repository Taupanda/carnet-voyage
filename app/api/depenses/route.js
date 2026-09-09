import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.from("depenses").select("*").order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  // Arrondi au centime : borne la précision stockée et évite les traînées de
  // flottant (0.1 + 0.2) qui ressortiraient à l'affichage sur deux décimales.
  const montant = Math.round(Number(body.montant) * 100) / 100;
  if (!Number.isFinite(montant)) {
    return NextResponse.json({ error: "montant invalide" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const payload = {
    date: body.date,
    categorie: body.categorie,
    montant,
    note: body.note || null,
  };
  if (body.id) payload.id = body.id;
  const { data, error } = await db.from("depenses").upsert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await request.json();
  const db = supabaseAdmin();
  const { error } = await db.from("depenses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
