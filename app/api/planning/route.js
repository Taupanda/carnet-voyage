import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

const clean = (v) => (typeof v === "string" ? v.trim() : "");
const estUneDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const debut = searchParams.get("debut");
  const fin = searchParams.get("fin");

  const db = supabaseAdmin();
  let q = db.from("plan_jours").select("*").order("date", { ascending: true });
  if (estUneDate(debut)) q = q.gte("date", debut);
  if (estUneDate(fin)) q = q.lte("date", fin);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// Une seule ligne par date : on écrit par upsert sur la date plutôt que de
// gérer création et modification séparément côté client.
export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  if (!estUneDate(body.date)) {
    return NextResponse.json({ error: "date invalide" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("plan_jours")
    .upsert(
      {
        date: body.date,
        activite: clean(body.activite) || null,
        lieu: clean(body.lieu) || null,
        fixe: !!body.fixe,
        note: clean(body.note) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "date" }
    )
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
  if (!estUneDate(date)) return NextResponse.json({ error: "date invalide" }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from("plan_jours").delete().eq("date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
