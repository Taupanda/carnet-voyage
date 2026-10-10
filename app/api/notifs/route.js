import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin, utilisateurDeLaRequete } from "../../../lib/server";

// Ce qui est arrivé DEPUIS LA DERNIÈRE FOIS, et rien d'autre.
//
// Les mots privés portent un vrai indicateur de lecture ; conseils et
// commentaires n'en ont pas, alors on retient la date de la dernière visite.
// Elle vit sur le profil, donc elle suit d'un appareil à l'autre.
//
// La cloche s'allumait parfois pour « rien » : un mot privé non lu (que la
// modération, où mène la cloche, ne montrait pas comme nouveau ni ne marquait
// lu), ou un commentaire de l'auteur lui-même. On renvoie désormais les
// éléments eux-mêmes, pour que la modération affiche exactement ce qui a
// allumé la cloche, et on ne compte plus ce que l'auteur a écrit.

async function dateDeVisite(db, u) {
  if (!u) return null;
  const { data } = await db.from("profiles").select("notifs_vues_le").eq("id", u.id).maybeSingle();
  return data?.notifs_vues_le || null;
}

const pasDeMoi = (q, u) => (u ? q.or(`user_id.is.null,user_id.neq.${u.id}`) : q);

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const u = await utilisateurDeLaRequete(request);
  const vueLe = await dateDeVisite(db, u);

  // Jamais ouvert : on s'en tient à la semaine écoulée plutôt qu'à tout
  // l'historique, sinon la première visite affiche un compteur décourageant.
  const depuis = vueLe || new Date(Date.now() - 7 * 86400000).toISOString();

  const [mots, conseils, commentaires] = await Promise.all([
    pasDeMoi(db.from("messages").select("id, contenu, created_at, user_id").eq("public", false).eq("lu", false), u)
      .order("created_at", { ascending: false }).limit(50),
    pasDeMoi(db.from("recos").select("id, titre, created_at, user_id").gt("created_at", depuis), u)
      .order("created_at", { ascending: false }).limit(50),
    pasDeMoi(db.from("comments").select("id, contenu, entry_date, created_at, user_id").gt("created_at", depuis), u)
      .order("created_at", { ascending: false }).limit(50),
  ]);
  const erreur = mots.error || conseils.error || commentaires.error;
  if (erreur) return NextResponse.json({ error: erreur.message }, { status: 500 });

  const elements = { mots: mots.data || [], conseils: conseils.data || [], commentaires: commentaires.data || [] };
  const detail = { mots: elements.mots.length, conseils: elements.conseils.length, commentaires: elements.commentaires.length };
  return NextResponse.json({
    ...detail,
    elements,
    depuis,
    dejaOuvert: !!vueLe,
    total: detail.mots + detail.conseils + detail.commentaires,
  });
}

// Marque comme vu : conseils et commentaires reçus jusqu'ici, et, si demandé,
// les mots privés affichés.
export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const u = await utilisateurDeLaRequete(request);
  if (!u) return NextResponse.json({ error: "compte non identifié" }, { status: 400 });
  const body = await request.json().catch(() => ({}));

  // update et non upsert : un upsert tente d'abord une insertion, que refuse
  // toute colonne obligatoire absente ici — et la cloche ne s'éteignait plus.
  const { data, error } = await db
    .from("profiles")
    .update({ notifs_vues_le: new Date().toISOString() })
    .eq("id", u.id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "profil introuvable" }, { status: 404 });

  const ids = Array.isArray(body.motsLus) ? body.motsLus.filter((x) => x != null) : [];
  if (ids.length) {
    const { error: e2 } = await db.from("messages").update({ lu: true }).in("id", ids);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
