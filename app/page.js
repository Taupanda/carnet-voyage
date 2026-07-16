import { supabasePublic, supabaseAdmin } from "../lib/server";
import { STAGES, stageForDate, TRIP_DAYS, todayLocal, dayNumberOf } from "../lib/stages";
import HomeFeed from "./HomeFeed";

export const revalidate = 120;

export default async function Home() {
  const db = supabasePublic();
  const { data } = await db
    .from("entries")
    .select("*")
    .eq("status", "published")
    .order("date", { ascending: false });

  const posts = (data || []).map((r) => (r.reflexion_privee ? { ...r, reflexion: null } : r));

  // rencontres liées (sans champ privé)
  const dates = posts.map((p) => p.date);
  if (dates.length) {
    const adminDb = supabaseAdmin();
    const { data: links } = await adminDb.from("entry_rencontres").select("entry_date, rencontre_id").in("entry_date", dates);
    const rIds = [...new Set((links || []).map((l) => l.rencontre_id))];
    if (rIds.length) {
      const { data: rencs } = await adminDb.from("rencontres").select("id, prenom, nom, photo_url, pays").in("id", rIds);
      const byId = Object.fromEntries((rencs || []).map((r) => [r.id, r]));
      const byDate = {};
      (links || []).forEach((l) => {
        (byDate[l.entry_date] = byDate[l.entry_date] || []).push(byId[l.rencontre_id]);
      });
      posts.forEach((p) => { p.rencontres_liees = (byDate[p.date] || []).filter(Boolean); });
    }
  }

  const points = [...posts].reverse().filter((p) => p.lat && p.lng)
    .map((p) => ({ lat: p.lat, lng: p.lng, titre: p.titre, day_number: p.day_number, date: p.date }));

  const today = todayLocal();
  const started = today >= STAGES[0].debut;
  const dayNum = started ? Math.min(TRIP_DAYS, dayNumberOf(today)) : null;

  const { count: rencCount } = await supabaseAdmin().from("rencontres").select("*", { count: "exact", head: true });
  const stats = {
    jours: posts.length,
    villes: new Set(posts.flatMap((p) => p.lieux || [])).size,
    photos: posts.reduce((s, p) => s + (p.photos?.length || 0), 0),
    rencontres: rencCount || 0,
  };

  return <HomeFeed posts={posts} points={points} stats={stats} dayNum={dayNum} started={started} />;
}
