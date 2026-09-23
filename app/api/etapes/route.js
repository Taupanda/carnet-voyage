import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";
import { ETAPES_DEFAUT, erreursEtapes } from "../../../lib/stages";
import { TAG_ETAPES } from "../../../lib/etapesServeur";

// Enregistre le découpage complet : les douze étapes d'un coup, jamais une
// seule, pour que la base ne puisse pas contenir un voyage à trous.
export async function POST(request) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const recues = Array.isArray(body?.etapes) ? body.etapes : [];
  if (recues.length !== ETAPES_DEFAUT.length) {
    return NextResponse.json({ error: `il faut ${ETAPES_DEFAUT.length} étapes` }, { status: 400 });
  }

  // Seuls le nom et les dates viennent du client ; numéro et couleur restent
  // ceux du code.
  const etapes = ETAPES_DEFAUT.map((d, i) => ({
    ...d,
    nom: String(recues[i]?.nom ?? "").trim(),
    debut: recues[i]?.debut,
    fin: recues[i]?.fin,
  }));
  const erreurs = erreursEtapes(etapes);
  if (erreurs.length) return NextResponse.json({ error: erreurs.join(" · ") }, { status: 400 });

  const maintenant = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("etapes")
    .upsert(etapes.map(({ n, nom, debut, fin }) => ({ n, nom, debut, fin, updated_at: maintenant })));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Les étapes s'affichent partout (bandeaux, calendrier, carte, livre) : on
  // invalide tout le site plutôt que de risquer une page restée sur l'ancien découpage.
  revalidateTag(TAG_ETAPES);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
