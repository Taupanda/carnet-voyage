import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data } = await db.from("budgets").select("*").eq("id", 1).maybeSingle();
  return NextResponse.json(data || { id: 1, hebdo: null, mensuel: null, global: null });
}

export async function POST(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const db = supabaseAdmin();
  const { data, error } = await db.from("budgets").upsert({
    id: 1,
    hebdo: body.hebdo || null,
    mensuel: body.mensuel || null,
    global: body.global || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
