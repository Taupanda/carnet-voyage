import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin, utilisateurDeLaRequete } from "../../../lib/server";

// Ce qui est arrivé DEPUIS LA DERNIÈRE FOIS, et rien d'autre.
//
// La première version comptait les conseils et commentaires des sept derniers
// jours. Un seul commentaire suffisait donc à garder la cloche allumée une
// semaine entière, même relu dix fois : le point rouge ne disait plus « il y a
// quelque chose à voir » mais « il s'est passé quelque chose récemment », ce qui
// n'appelle aucune action et apprend surtout à l'ignorer.
//
// Les mots privés portent un vrai indicateur de lecture ; conseils et
// commentaires n'en ont pas, alors on retient la date de la dernière visite.
// Elle vit sur le profil, donc elle suit d'un appareil à l'autre.

async function dateDeVisite(db, request) {
  const u = await utilisateurDeLaRequete(request);
  if (!u) return { id: null, vueLe: null };
  const { data } = await db.from("profiles").select("notifs_vues_le").eq("id", u.id).maybeSingle();
  return { id: u.id, vueLe: data?.notifs_vues_le || null };
}

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { vueLe } = await dateDeVisite(db, request);

  // Jamais ouvert : on s'en tient à la semaine écoulée plutôt qu'à tout
  // l'historique, sinon la première visite affiche un compteur décourageant.
  const depuis = vueLe || new Date(Date.now() - 7 * 86400000).toISOString();

  const [mots, conseils, commentaires] = await Promise.all([
    db.from("messages").select("id", { count: "exact", head: true }).eq("public", false).eq("lu", false),
    db.from("recos").select("id", { count: "exact", head: true }).gt("created_at", depuis),
    db.from("comments").select("id", { count: "exact", head: true }).gt("created_at", depuis),
  ]);

  const detail = {
    mots: mots.count || 0,
    conseils: conseils.count || 0,
    commentaires: commentaires.count || 0,
  };
  return NextResponse.json({
    ...detail,
    depuis,
    dejaOuvert: !!vueLe,
    total: detail.mots + detail.conseils + detail.commentaires,
  });
}

// Marque comme vu. Appelé en ouvrant la modération : à partir de là, seul ce qui
// arrive ensuite rallume la cloche.
export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const u = await utilisateurDeLaRequete(request);
  if (!u) return NextResponse.json({ ok: false, raison: "compte non identifié" });
  const { error } = await db
    .from("profiles")
    .upsert({ id: u.id, notifs_vues_le: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
