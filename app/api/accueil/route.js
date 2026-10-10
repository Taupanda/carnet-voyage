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

  const [notes, post, depenses] = await Promise.all([
    db.from("notes_jour").select("id, texte").eq("date", jour).eq("utilisee", false),
    db.from("entries").select("date, status").eq("date", jour).maybeSingle(),
    db.from("depenses").select("montant").eq("date", jour),
  ]);

  // Dernière position connue : la météo de l'accueil suit le voyage plutôt
  // qu'un point fixe. Repli sur Mexico tant qu'aucun post n'est géolocalisé.
  const { data: pos } = await db
    .from("entries")
    .select("lat, lng, lieux")
    .not("lat", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    notes: (notes.data || []).map((n) => n.texte),
    postDuJour: post.data ? post.data.status : null, // null | "draft" | "published"
    depenseDuJour: (depenses.data || []).reduce((s, d) => s + Number(d.montant || 0), 0),
    lieu: {
      lat: pos?.lat ?? 19.4326,
      lng: pos?.lng ?? -99.1332,
      nom: pos?.lieux?.[0] || "Mexico",
    },
  });
}
