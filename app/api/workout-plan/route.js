import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.from("workout_plan").select("*").order("jour_semaine");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();  // { jour_semaine, titre, repos, exercices }
  const db = supabaseAdmin();
  const { data, error } = await db.from("workout_plan").upsert({
    jour_semaine: body.jour_semaine,
    titre: body.titre || null,
    repos: !!body.repos,
    exercices: body.exercices || [],
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
