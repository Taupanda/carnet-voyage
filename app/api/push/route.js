import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin, utilisateurDeLaRequete } from "../../../lib/server";

export async function GET() {
  // expose the public VAPID key to the browser
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

export async function POST(request) {
  const { subscription, role } = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "subscription invalide" }, { status: 400 });
  }
  // only the admin can register as 'admin'
  const finalRole = role === "admin" && (await checkAdmin(request)) ? "admin" : "reader";

  // Le navigateur est rattaché au compte quand la personne est connectée : sans
  // ce lien on ne peut ni dire qui est abonné, ni cesser d'écrire à quelqu'un
  // qu'on vient de bloquer. Un visiteur non connecté reste abonné sans compte.
  const utilisateur = await utilisateurDeLaRequete(request);

  const db = supabaseAdmin();
  const { error } = await db.from("push_subs").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth,
      role: finalRole,
      user_id: utilisateur?.id || null,
    },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, role: finalRole });
}

export async function DELETE(request) {
  const { endpoint } = await request.json();
  const db = supabaseAdmin();
  await db.from("push_subs").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
