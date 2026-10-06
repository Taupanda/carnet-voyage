import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "../../../lib/server";
import { calendrierServeur } from "../../../lib/etapesServeur";
import { soireeEnCours, heureEtDate } from "../../../lib/stages";

// Le rappel part à 23 h, heure locale de l'étape en cours. Selon l'étape,
// 23 h tombe à 4, 5 ou 6 h UTC : vercel.json appelle cette route à chacune de
// ces heures, et seule celle qui tombe à 23 h sur place envoie quelque chose.
const HEURE_RAPPEL = 23;
const veille = (d) => new Date(Date.parse(d + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);

async function sendTo(subs, payload) {
  webpush.setVapidDetails(
    "mailto:carnet@voyage.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  const db = supabaseAdmin();
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      )
    )
  );
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected" && [404, 410].includes(r.reason?.statusCode)) {
      await db.from("push_subs").delete().eq("endpoint", subs[i].endpoint);
    }
  }
  return results.filter((r) => r.status === "fulfilled").length;
}

export async function GET(request) {
  const auth = request.headers.get("authorization");
  const isCron = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  const isManualTest = new URL(request.url).searchParams.get("test") === "1";

  if (!isCron && !isManualTest) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID non configuré" }, { status: 500 });
  }

  const db = supabaseAdmin();
  const { STAGES, stageForDate } = await calendrierServeur();
  const maintenant = new Date();
  let soiree = soireeEnCours(maintenant, STAGES, HEURE_RAPPEL);
  if (!soiree) {
    if (!isManualTest) {
      return NextResponse.json({ ok: true, actions: [`pas ${HEURE_RAPPEL} h sur place, rien à envoyer`] });
    }
    // Test manuel : on prend la date locale de l'étape en cours, quelle que soit l'heure.
    const parDefaut = STAGES[0].fuseau;
    const d = heureEtDate(maintenant, parDefaut).date;
    const etape = stageForDate(d);
    soiree = { date: heureEtDate(maintenant, etape?.fuseau || parDefaut).date, fuseau: etape?.fuseau || parDefaut };
  }
  const today = soiree.date;
  const actions = [`${HEURE_RAPPEL} h à ${soiree.fuseau}, journée du ${today}`];

  // --- Which recent days are still missing a note? ---
  const since = veille(veille(today));
  const { data: recent } = await db
    .from("entries")
    .select("date")
    .gte("date", since)
    .lte("date", today);
  const written = new Set((recent || []).map((r) => r.date));

  const missing = [];
  for (let i = 0, d = today; i <= 2; i++, d = veille(d)) {
    // only count days inside the trip
    if (stageForDate(d) && !written.has(d)) missing.push(d);
  }

  if (missing.length > 0) {
    const { data: admins } = await db.from("push_subs").select("*").eq("role", "admin");
    if (admins?.length) {
      let payload;
      if (missing.length === 1 && missing[0] === today) {
        payload = {
          title: "Alors, cette journée ?",
          body: "Deux minutes pour raconter, et c'est dans les aventures.",
          url: `/journal?date=${today}`,
          tag: "reminder",
          requireInteraction: true,
        };
      } else {
        payload = {
          title: `${missing.length} journées attendent`,
          body: "Elles sont encore fraîches — on les met par écrit ?",
          url: "/journal",
          tag: "reminder",
          requireInteraction: true,
        };
      }
      const sent = await sendTo(admins, payload);
      actions.push(`rappel envoyé à ${sent} appareil(s) — jours manquants : ${missing.join(", ")}`);
    } else {
      actions.push("jours manquants mais aucun appareil abonné (role=admin)");
    }
  } else {
    actions.push("tout est à jour, pas de rappel");
  }

  // Plus de notification visiteur automatique (ni alerte d'étape ni digest) :
  // le récap hebdo est envoyé manuellement depuis l'éditeur (/resumes).

  return NextResponse.json({ ok: true, localDate: today, missing, actions });
}
