import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: msgs, error } = await db
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [...new Set((msgs || []).map((m) => m.user_id))];
  let byId = {};
  if (ids.length) {
    const { data: profs } = await db
      .from("profiles")
      .select("id, prenom, nom, avatar_url")
      .in("id", ids);
    byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  }
  return NextResponse.json((msgs || []).map((m) => ({ ...m, profiles: byId[m.user_id] || null })));
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  const db = supabaseAdmin();
  await db.from("messages").update({ lu: true }).eq("id", id);
  return NextResponse.json({ ok: true });
}
