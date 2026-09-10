import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

// Le seul compteur dont la cloche a besoin. Volontairement minuscule : la
// barre du haut est montée sur toutes les pages, elle ne peut pas se permettre
// la requête complète de l'accueil.
export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const ilYaUneSemaine = new Date(Date.now() - 7 * 86400000).toISOString();

  const [mots, conseils, commentaires] = await Promise.all([
    db.from("messages").select("id", { count: "exact", head: true }).eq("public", false).eq("lu", false),
    db.from("recos").select("id", { count: "exact", head: true }).gte("created_at", ilYaUneSemaine),
    db.from("comments").select("id", { count: "exact", head: true }).gte("created_at", ilYaUneSemaine),
  ]);

  const detail = {
    mots: mots.count || 0,
    conseils: conseils.count || 0,
    commentaires: commentaires.count || 0,
  };
  return NextResponse.json({ ...detail, total: detail.mots + detail.conseils + detail.commentaires });
}
