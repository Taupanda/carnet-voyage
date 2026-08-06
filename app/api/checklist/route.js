import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("checklist_items")
    .select("*")
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { groupe, texte, ordre } = await request.json();
  if (!texte || !String(texte).trim()) {
    return NextResponse.json({ error: "texte requis" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("checklist_items")
    .insert({ groupe: groupe || "general", texte: String(texte).trim(), ordre: Number.isFinite(ordre) ? ordre : 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id, ...fields } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const patch = {};
  if (typeof fields.done === "boolean") patch.done = fields.done;
  if (typeof fields.texte === "string") patch.texte = fields.texte;
  if (typeof fields.groupe === "string") patch.groupe = fields.groupe;
  if (typeof fields.ordre === "number") patch.ordre = fields.ordre;
  const db = supabaseAdmin();
  const { data, error } = await db.from("checklist_items").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  const db = supabaseAdmin();
  const { error } = await db.from("checklist_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
