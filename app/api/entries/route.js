import { NextResponse } from "next/server";
import { supabaseAdmin, supabasePublic, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  const isAdmin = await checkAdmin(request);
  const db = isAdmin ? supabaseAdmin() : supabasePublic();
  let query = db.from("entries").select("*").order("date", { ascending: false });
  if (!isAdmin) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // hide private reflections from public
  const rows = isAdmin
    ? data
    : data.map((r) => (r.reflexion_privee ? { ...r, reflexion: null } : r));
  return NextResponse.json(rows);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const entry = await request.json();
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("entries")
    .upsert({ ...entry, updated_at: new Date().toISOString() }, { onConflict: "date" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { date } = await request.json();
  const db = supabaseAdmin();
  const { error } = await db.from("entries").delete().eq("date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
