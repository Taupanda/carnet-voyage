import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

// Les trois espaces d'expression des visiteurs, tous rattachés à un compte.
const CONTENUS = {
  commentaire: { table: "comments", texte: "contenu" },
  message: { table: "messages", texte: "contenu" },
  reco: { table: "recos", texte: "titre" },
};

async function profilsPar(db, ids) {
  if (!ids.length) return {};
  const { data } = await db.from("profiles").select("id, prenom, nom, avatar_url, bloque").in("id", ids);
  return Object.fromEntries((data || []).map((p) => [p.id, p]));
}

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();

  const [comments, messages, recos, profiles] = await Promise.all([
    db.from("comments").select("*").order("created_at", { ascending: false }),
    db.from("messages").select("*").order("created_at", { ascending: false }),
    db.from("recos").select("*").order("created_at", { ascending: false }),
    db.from("profiles").select("*").order("prenom", { ascending: true }),
  ]);

  const erreur = comments.error || messages.error || recos.error || profiles.error;
  if (erreur) return NextResponse.json({ error: erreur.message }, { status: 500 });

  // L'e-mail et la date d'inscription vivent dans auth.users, pas dans profiles :
  // seule la clé de service peut les lire.
  let comptes = {};
  try {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    comptes = Object.fromEntries(
      (data?.users || []).map((u) => [
        u.id,
        {
          email: u.email,
          inscrit_le: u.created_at,
          derniere_connexion: u.last_sign_in_at,
          fournisseur: u.app_metadata?.provider || "email",
        },
      ])
    );
  } catch (e) {
    // Liste des comptes indisponible : on rend quand même les profils et les
    // contenus, plutôt que de renvoyer une page vide.
    comptes = {};
  }

  const compter = (rows, id) => (rows || []).filter((r) => r.user_id === id).length;
  const membres = (profiles.data || []).map((p) => ({
    ...p,
    ...(comptes[p.id] || {}),
    nb_commentaires: compter(comments.data, p.id),
    nb_messages: compter(messages.data, p.id),
    nb_recos: compter(recos.data, p.id),
  }));

  const ids = [
    ...new Set([...(comments.data || []), ...(messages.data || []), ...(recos.data || [])].map((r) => r.user_id)),
  ].filter(Boolean);
  const parId = await profilsPar(db, ids);
  const avecAuteur = (rows) => (rows || []).map((r) => ({ ...r, auteur: parId[r.user_id] || null }));

  return NextResponse.json({
    membres,
    commentaires: avecAuteur(comments.data),
    messages: avecAuteur(messages.data),
    recos: avecAuteur(recos.data),
    comptesLisibles: Object.keys(comptes).length > 0,
  });
}

// Blocage d'un membre, ou bascule public/privé d'un mot du livre d'or.
export async function PATCH(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { action, id, valeur } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const db = supabaseAdmin();

  if (action === "bloquer") {
    const { data, error } = await db
      .from("profiles")
      .update({ bloque: !!valeur })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === "publier") {
    const { data, error } = await db
      .from("messages")
      .update({ public: !!valeur })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "action inconnue" }, { status: 400 });
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { type, id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const db = supabaseAdmin();

  // Un contenu isolé.
  if (CONTENUS[type]) {
    const { error } = await db.from(CONTENUS[type].table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Tout ce qu'un membre a écrit, sans toucher à son compte.
  if (type === "contenus") {
    const compte = {};
    for (const [nom, { table }] of Object.entries(CONTENUS)) {
      const { error, count } = await db.from(table).delete({ count: "exact" }).eq("user_id", id);
      if (error) {
        return NextResponse.json({ error: `${table} : ${error.message}` }, { status: 500 });
      }
      compte[nom] = count || 0;
    }
    // Likes et réactions partent aussi : ils n'ont plus d'objet.
    await db.from("likes").delete().eq("user_id", id);
    await db.from("reactions").delete().eq("user_id", id);
    return NextResponse.json({ ok: true, supprimes: compte });
  }

  // Le compte lui-même. Irréversible, et emporte tout ce qui en dépend.
  if (type === "compte") {
    for (const { table } of Object.values(CONTENUS)) {
      await db.from(table).delete().eq("user_id", id);
    }
    await db.from("likes").delete().eq("user_id", id);
    await db.from("reactions").delete().eq("user_id", id);
    await db.from("profiles").delete().eq("id", id);
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "type inconnu" }, { status: 400 });
}
