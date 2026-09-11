import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin, photoPathFromUrl } from "../../../lib/server";

// Des photos peuvent rester dans le bucket sans être rattachées à quoi que ce
// soit : un post abandonné avant d'être enregistré, un partage depuis la
// galerie qui n'a pas abouti. Elles n'apparaissent nulle part et ne disparaissent
// jamais d'elles-mêmes.
//
// GET  : recense, sans rien supprimer.
// POST : supprime, uniquement ce que le recensement vient de désigner.

// Une photo tout juste téléversée n'est PAS encore référencée : elle attend que
// l'entrée soit enregistrée. Sans ce délai, le nettoyage effacerait le travail
// en cours. Vingt-quatre heures laissent largement le temps d'écrire son post.
const AGE_MINIMUM_H = 24;

async function listerBucket(db, prefixe = "", sortie = []) {
  const { data, error } = await db.storage
    .from("photos")
    .list(prefixe, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw new Error(error.message);
  for (const item of data || []) {
    const chemin = prefixe ? `${prefixe}/${item.name}` : item.name;
    // Un dossier n'a pas de métadonnées ; un fichier en a toujours.
    if (item.id === null || !item.metadata) await listerBucket(db, chemin, sortie);
    else sortie.push({ chemin, taille: item.metadata?.size ?? 0, cree: item.created_at || null });
  }
  return sortie;
}

async function recenser(db) {
  const [fichiers, entries, rencontres] = await Promise.all([
    listerBucket(db),
    db.from("entries").select("photos, photo_principale"),
    db.from("rencontres").select("photo_url"),
  ]);
  if (entries.error) throw new Error(entries.error.message);
  if (rencontres.error) throw new Error(rencontres.error.message);

  // Tout ce qui est référencé quelque part, ramené au chemin dans le bucket.
  const utilises = new Set();
  for (const e of entries.data || []) {
    for (const u of Array.isArray(e.photos) ? e.photos : []) {
      const p = photoPathFromUrl(u);
      if (p) utilises.add(p);
    }
    const pp = photoPathFromUrl(e.photo_principale);
    if (pp) utilises.add(pp);
  }
  for (const r of rencontres.data || []) {
    const p = photoPathFromUrl(r.photo_url);
    if (p) utilises.add(p);
  }

  const limite = Date.now() - AGE_MINIMUM_H * 3600 * 1000;
  const orphelines = [];
  let recentesEpargnees = 0;
  for (const f of fichiers) {
    if (utilises.has(f.chemin)) continue;
    // Sans date de création, on s'abstient : on ne supprime que ce dont on est sûr.
    const date = f.cree ? Date.parse(f.cree) : NaN;
    if (!Number.isFinite(date) || date > limite) { recentesEpargnees++; continue; }
    orphelines.push(f);
  }
  return {
    total: fichiers.length,
    utilisees: utilises.size,
    orphelines,
    recentesEpargnees,
    octets: orphelines.reduce((s, f) => s + (f.taille || 0), 0),
  };
}

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const r = await recenser(supabaseAdmin());
    return NextResponse.json({ ...r, orphelines: r.orphelines.map((f) => f.chemin) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (body?.confirmer !== true) {
    return NextResponse.json({ error: "confirmation requise" }, { status: 400 });
  }
  const db = supabaseAdmin();
  try {
    // Le recensement est refait ici : on ne supprime jamais une liste transmise
    // par le client, qui pourrait être périmée ou fabriquée.
    const r = await recenser(db);
    const chemins = r.orphelines.map((f) => f.chemin);
    let supprimees = 0;
    for (let i = 0; i < chemins.length; i += 100) {
      const lot = chemins.slice(i, i + 100);
      const { error } = await db.storage.from("photos").remove(lot);
      if (error) throw new Error(error.message);
      supprimees += lot.length;
    }
    return NextResponse.json({ supprimees, octets: r.octets, recentesEpargnees: r.recentesEpargnees });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
