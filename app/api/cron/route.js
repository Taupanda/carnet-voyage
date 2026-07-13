import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "../../../lib/server";
import { stageForDate, STAGES } from "../../../lib/stages";

// Mexico / Central America ≈ UTC-6.
// Cron runs once a day at 02:00 UTC = 20:00 local.
const LOCAL_OFFSET = -6;

function localNow() {
  return new Date(Date.now() + LOCAL_OFFSET * 3600 * 1000);
}
function ymd(d) {
  return d.toISOString().slice(0, 10);
}

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
  const local = localNow();
  const today = ymd(local);
  const actions = [];

  // --- Which recent days are still missing a note? ---
  const since = ymd(new Date(local.getTime() - 3 * 86400000));
  const { data: recent } = await db
    .from("entries")
    .select("date")
    .gte("date", since)
    .lte("date", today);
  const written = new Set((recent || []).map((r) => r.date));

  const missing = [];
  for (let i = 0; i <= 2; i++) {
    const d = ymd(new Date(local.getTime() - i * 86400000));
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
          body: "Deux minutes pour raconter, et c'est dans le carnet.",
          url: "/journal",
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

  // --- New stage starting today? Alert readers. ---
  const stage = STAGES.find((s) => s.debut === today);
  if (stage) {
    const { data: readers } = await db.from("push_subs").select("*");
    if (readers?.length) {
      const sent = await sendTo(readers, {
        title: `Nouvelle étape : ${stage.nom}`,
        body: `Étape ${stage.n} sur 12 du voyage commence.`,
        url: "/",
        tag: `stage-${stage.n}`,
      });
      actions.push(`alerte étape ${stage.n} envoyée à ${sent} abonné(s)`);
    }
  }

  return NextResponse.json({ ok: true, localDate: today, missing, actions });
}
