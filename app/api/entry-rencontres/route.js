import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

// GET ?date=YYYY-MM-DD : rencontres liées à un post (public, sans réseaux)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const isAdmin = await checkAdmin(request);
  const db = supabaseAdmin();

  let linkQuery = db.from("entry_rencontres").select("entry_date, rencontre_id");
  if (date) linkQuery = linkQuery.eq("entry_date", date);
  const { data: links, error } = await linkQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [...new Set((links || []).map((l) => l.rencontre_id))];
  if (!ids.length) return NextResponse.json(date ? [] : {});

  const { data: rencs } = await db.from("rencontres").select("*").in("id", ids);
  const clean = isAdmin ? rencs : (rencs || []).map(({ reseaux, ...r }) => r);
  const byId = Object.fromEntries((clean || []).map((r) => [r.id, r]));

  if (date) {
    // renvoie la liste des rencontres pour cette date
    return NextResponse.json((links || []).map((l) => byId[l.rencontre_id]).filter(Boolean));
  }
  // sinon : map date -> [rencontres]
  const map = {};
  (links || []).forEach((l) => {
    (map[l.entry_date] = map[l.entry_date] || []).push(byId[l.rencontre_id]);
  });
  return NextResponse.json(map);
}

// POST admin : définir les rencontres liées à une date (remplace l'existant)
export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { entry_date, rencontre_ids } = await request.json();
  const db = supabaseAdmin();
  await db.from("entry_rencontres").delete().eq("entry_date", entry_date);
  if (rencontre_ids?.length) {
    const rows = rencontre_ids.map((id) => ({ entry_date, rencontre_id: id }));
    const { error } = await db.from("entry_rencontres").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
