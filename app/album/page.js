import { supabasePublic } from "../../lib/server";
import AlbumClient from "./AlbumClient";

export const revalidate = 120;

export default async function Album() {
  const db = supabasePublic();
  const { data } = await db
    .from("entries")
    .select("date, day_number, titre, photos, lieux")
    .eq("status", "published")
    .order("date", { ascending: false });

  const shots = [];
  for (const e of data || []) {
    for (const url of e.photos || []) {
      shots.push({ url, date: e.date, day: e.day_number, titre: e.titre, lieu: e.lieux?.[0] || "" });
    }
  }
  return <AlbumClient shots={shots} />;
}
