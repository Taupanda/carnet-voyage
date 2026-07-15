import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: comments, error } = await db
    .from("comments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [...new Set((comments || []).map((c) => c.user_id))];
  let byId = {};
  if (ids.length) {
    const { data: profs } = await db
      .from("profiles").select("id, prenom, nom, avatar_url").in("id", ids);
    byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  }
  return NextResponse.json(
    (comments || []).map((c) => ({ ...c, profiles: byId[c.user_id] || null }))
  );
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  const db = supabaseAdmin();
  const { error } = await db.from("comments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
