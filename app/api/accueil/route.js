import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

// Tout ce dont la page d'accueil a besoin, en une requête et sans rapatrier de
// contenu : uniquement des compteurs et l'état de la journée.
export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const jour = new URL(request.url).searchParams.get("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour || "")) {
    return NextResponse.json({ error: "date invalide" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const ilYaUneSemaine = new Date(Date.now() - 7 * 86400000).toISOString();

  const [notes, post, motsNonLus, conseils, commentaires, depenses] = await Promise.all([
    db.from("notes_jour").select("id, texte").eq("date", jour).eq("utilisee", false),
    db.from("entries").select("date, status").eq("date", jour).maybeSingle(),
    // Les mots privés portent un vrai indicateur de lecture.
    db.from("messages").select("id", { count: "exact", head: true }).eq("public", false).eq("lu", false),
    // Conseils et commentaires n'en ont pas : on compte ceux de la semaine.
    db.from("recos").select("id", { count: "exact", head: true }).gte("created_at", ilYaUneSemaine),
    db.from("comments").select("id", { count: "exact", head: true }).gte("created_at", ilYaUneSemaine),
    db.from("depenses").select("montant").eq("date", jour),
  ]);

  return NextResponse.json({
    notes: (notes.data || []).map((n) => n.texte),
    postDuJour: post.data ? post.data.status : null, // null | "draft" | "published"
    motsNonLus: motsNonLus.count || 0,
    conseilsSemaine: conseils.count || 0,
    commentairesSemaine: commentaires.count || 0,
    depenseDuJour: (depenses.data || []).reduce((s, d) => s + Number(d.montant || 0), 0),
  });
}
