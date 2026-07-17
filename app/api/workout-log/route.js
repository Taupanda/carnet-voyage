import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.from("workout_log").select("*").order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();  // { date, statut, titre, exercices, note }
  const db = supabaseAdmin();
  const { data, error } = await db.from("workout_log").upsert({
    date: body.date,
    statut: body.statut,
    titre: body.titre || null,
    exercices: body.exercices || [],
    note: body.note || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { date } = await request.json();
  const db = supabaseAdmin();
  const { error } = await db.from("workout_log").delete().eq("date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
