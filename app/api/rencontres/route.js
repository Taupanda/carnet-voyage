import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

// La page d'accueil lit les rencontres côté serveur (compteur + « Croisé·es ce
// jour-là » sur chaque post) et elle est en ISR : sans purge, une rencontre
// supprimée y reste affichée. /rencontres, elle, fetch côté client : rien à purger.
function purgeAccueil() {
  revalidatePath("/");
}

// GET public : liste des rencontres SANS le champ privé "reseaux"
// GET admin (avec token) : tout, réseaux inclus
export async function GET(request) {
  const isAdmin = await checkAdmin(request);
  // lecture via service_role (RLS active sans policy publique), on filtre le privé pour le public
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("rencontres")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = isAdmin ? data : (data || []).map(({ reseaux, ...r }) => r);
  return NextResponse.json(rows || []);
}

// POST admin : créer ou mettre à jour une rencontre
export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const db = supabaseAdmin();
  const payload = {
    prenom: body.prenom,
    nom: body.nom || null,
    photo_url: body.photo_url || null,
    pays: body.pays || null,
    lieu_rencontre: body.lieu_rencontre || null,
    activites: body.activites || null,
    anecdote: body.anecdote || null,
    reseaux: body.reseaux || null,
  };
  if (body.id) payload.id = body.id;

  const { data, error } = await db.from("rencontres").upsert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgeAccueil();
  return NextResponse.json(data);
}

// DELETE admin
export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const db = supabaseAdmin();

  // Les liens post ↔ rencontre doivent partir en premier : tant qu'ils existent,
  // la ligne `rencontres` est référencée et la suppression est rejetée.
  const { error: linkError } = await db
    .from("entry_rencontres")
    .delete()
    .eq("rencontre_id", id);
  if (linkError) {
    return NextResponse.json(
      { error: `suppression des liens aux posts : ${linkError.message}` },
      { status: 500 }
    );
  }

  const { error } = await db.from("rencontres").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgeAccueil();
  return NextResponse.json({ ok: true });
}
