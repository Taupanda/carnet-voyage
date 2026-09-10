import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, checkAdmin, removePhotos } from "../../../lib/server";

// Les pages publiques qui listent les posts sont en ISR (export const revalidate).
// Sans purge explicite, un post supprimé (ou publié/modifié) reste visible jusqu'à
// l'expiration du cache — `router.refresh()` côté client ne suffit pas, il relit
// le rendu déjà mis en cache par le serveur.
function purgePublicPages() {
  for (const p of ["/", "/album", "/calendrier", "/etapes", "/semaines", "/livre"]) {
    revalidatePath(p);
  }
  revalidatePath("/etape/[n]", "page"); // toutes les pages d'étape
}

export async function GET(request) {
  const isAdmin = await checkAdmin(request);
  // Toujours service_role côté serveur (anon n'a plus accès à entries). Le filtre
  // status=published et le masquage de reflexion_privee ci-dessous protègent le public.
  const db = supabaseAdmin();
  const demandee = new URL(request.url).searchParams.get("date");
  let query = db.from("entries").select("*").order("date", { ascending: false });
  // Filtre facultatif : évite de rapatrier tout le voyage quand une seule
  // journée est demandée (la barre d'actions ne teste qu'aujourd'hui).
  if (/^\d{4}-\d{2}-\d{2}$/.test(demandee || "")) query = query.eq("date", demandee);
  if (!isAdmin) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // hide private reflections from public
  const rows = isAdmin
    ? data
    : data.map((r) => (r.reflexion_privee ? { ...r, reflexion: null } : r));
  return NextResponse.json(rows);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const entry = await request.json();
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("entries")
    .upsert({ ...entry, updated_at: new Date().toISOString() }, { onConflict: "date" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgePublicPages();
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { date } = await request.json();
  if (!date) return NextResponse.json({ error: "date manquante" }, { status: 400 });
  const db = supabaseAdmin();

  // Relu avant la suppression : après, les URLs des photos ne sont plus récupérables.
  const { data: existing } = await db
    .from("entries")
    .select("photos, photo_principale")
    .eq("date", date)
    .maybeSingle();

  // Tout ce qui est rattaché au post par sa date part avec lui : sinon les lignes
  // restent orphelines (et ressortiraient sur un nouveau post créé à la même date).
  for (const table of ["comments", "likes", "reactions", "entry_rencontres"]) {
    const { error } = await db.from(table).delete().eq("entry_date", date);
    if (error) {
      return NextResponse.json(
        { error: `suppression ${table} : ${error.message}` },
        { status: 500 }
      );
    }
  }

  const { error } = await db.from("entries").delete().eq("date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // photo_principale est l'une des photos du post : le dédoublonnage est fait
  // par removePhotos.
  await removePhotos([...(existing?.photos || []), existing?.photo_principale]);
  purgePublicPages();
  return NextResponse.json({ ok: true });
}
