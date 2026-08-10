import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

// Suppression de modération par l'admin (contourne la RLS via service_role).
// Table restreinte à une liste blanche.
const ALLOWED = ["recos", "rencontres", "messages", "comments"];

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { table, id } = await request.json();
  if (!ALLOWED.includes(table) || !id) {
    return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
