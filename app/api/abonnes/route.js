import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";
import { destinatairesRecap, envoiEmailDispo } from "../../../lib/courriel";

// Qui recevra le prochain récap, par canal.
//
// La même sélection que l'envoi réel — destinatairesRecap — plutôt qu'un compte
// approchant : une liste qui annoncerait douze abonnés là où huit reçoivent
// vraiment le message ne servirait qu'à masquer le problème.
export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();

  const [profils, subs] = await Promise.all([
    db.from("profiles").select("id, prenom, nom, recap_email, bloque"),
    db.from("push_subs").select("endpoint, user_id, role"),
  ]);
  if (profils.error) return NextResponse.json({ error: profils.error.message }, { status: 500 });

  // Les adresses vivent dans auth.users. Sans droit de les lire, on rend quand
  // même la liste : les noms sortent, les adresses manquent, et c'est dit.
  let comptes = {};
  let adressesLisibles = true;
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      for (const u of data?.users || []) comptes[u.id] = { email: u.email || "", cree: u.created_at || null };
      if ((data?.users || []).length < 200) break;
    }
  } catch {
    comptes = {};
    adressesLisibles = false;
  }

  const emails = Object.fromEntries(Object.entries(comptes).map(([id, c]) => [id, c.email]));
  const joignables = new Set(destinatairesRecap(profils.data, emails).map((d) => d.id));

  const parEmail = (profils.data || [])
    .filter((p) => p.recap_email && !p.bloque)
    .map((p) => ({
      id: p.id,
      nom: [p.prenom, p.nom].filter(Boolean).join(" ") || "Sans nom",
      email: comptes[p.id]?.email || null,
      inscrit_le: comptes[p.id]?.cree || null,
      joignable: joignables.has(p.id),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  // Un abonnement push sans compte vient d'un visiteur non connecté : il compte,
  // mais on ne peut lui donner ni nom ni adresse.
  const bloques = new Set((profils.data || []).filter((p) => p.bloque).map((p) => p.id));
  const pushActifs = (subs.data || []).filter((s) => !s.user_id || !bloques.has(s.user_id));
  const nomsParId = Object.fromEntries((profils.data || []).map((p) => [p.id, [p.prenom, p.nom].filter(Boolean).join(" ")]));

  return NextResponse.json({
    emailConfigure: envoiEmailDispo(),
    adressesLisibles,
    parEmail,
    push: {
      total: pushActifs.length,
      sansCompte: pushActifs.filter((s) => !s.user_id).length,
      noms: [...new Set(pushActifs.filter((s) => s.user_id).map((s) => nomsParId[s.user_id] || "Compte inconnu"))].sort((a, b) => a.localeCompare(b, "fr")),
      bloquesEcartes: (subs.data || []).length - pushActifs.length,
    },
  });
}
