import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";
import { rassemblerAnecdotes, normaliser } from "../../../lib/anecdotes";

// GET : toutes les anecdotes du voyage, avec leurs étoiles.
export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [entries, etoiles] = await Promise.all([
    db.from("entries").select("date, day_number, titre, lieux, anecdote, status").not("anecdote", "is", null),
    db.from("anecdotes_etoiles").select("entry_date, texte"),
  ]);
  if (entries.error) return NextResponse.json({ error: entries.error.message }, { status: 500 });
  // Table pas encore créée : les anecdotes s'affichent quand même, sans étoiles.
  const sansTable = !!etoiles.error;
  return NextResponse.json({
    anecdotes: rassemblerAnecdotes(entries.data, sansTable ? [] : etoiles.data),
    etoilesIndisponibles: sansTable ? etoiles.error.message : null,
  });
}

// POST { date, texte, etoile } : met ou retire l'étoile.
export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { date, texte, etoile } = await request.json().catch(() => ({}));
  const t = normaliser(texte);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !t) {
    return NextResponse.json({ error: "anecdote invalide" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = etoile
    ? await db.from("anecdotes_etoiles").upsert({ entry_date: date, texte: t })
    : await db.from("anecdotes_etoiles").delete().eq("entry_date", date).eq("texte", t);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
