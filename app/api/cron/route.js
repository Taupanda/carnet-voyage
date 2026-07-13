import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "../../../lib/server";
import { stageForDate } from "../../../lib/stages";

// Mexico/Central America is UTC-6 (roughly). Cron runs hourly; we act at local 20h and 9h.
const LOCAL_OFFSET = -6;

function localNow() {
  const now = new Date();
  return new Date(now.getTime() + LOCAL_OFFSET * 3600 * 1000);
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
  // clean up dead subscriptions
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected" && [404, 410].includes(r.reason?.statusCode)) {
      await db.from("push_subs").delete().eq("endpoint", subs[i].endpoint);
    }
  }
  return results.filter((r) => r.status === "fulfilled").length;
}

export async function GET(request) {
  // protect the endpoint (Vercel Cron sends this header)
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID non configuré" }, { status: 500 });
  }

  const db = supabaseAdmin();
  const local = localNow();
  const hour = local.getUTCHours();
  const today = ymd(local);
  const yesterday = ymd(new Date(local.getTime() - 86400000));

  const actions = [];

  // --- Reminder for the traveller (admin) ---
  if (hour === 20 || hour === 9) {
    const targetDate = hour === 20 ? today : yesterday; // 20h: today's note. 9h: yesterday's, if missed.
    const { data: existing } = await db.from("entries").select("date").eq("date", targetDate).maybeSingle();

    if (!existing) {
      const { data: admins } = await db.from("push_subs").select("*").eq("role", "admin");
      if (admins?.length) {
        const payload =
          hour === 20
            ? {
                title: "Alors, cette journée ?",
                body: "Deux minutes pour raconter, et c'est dans le carnet.",
                url: "/journal",
                tag: "reminder",
                requireInteraction: true,
              }
            : {
                title: "La journée d'hier attend encore",
                body: "Un café et on la met par écrit ?",
                url: "/journal",
                tag: "reminder",
                requireInteraction: true,
              };
        const sent = await sendTo(admins, payload);
        actions.push(`rappel ${hour}h envoyé à ${sent} appareil(s) pour le ${targetDate}`);
      }
    } else {
      actions.push(`note du ${targetDate} déjà écrite, pas de rappel`);
    }
  }

  // --- New stage alert for readers (once, at 10h local on the first day of a stage) ---
  if (hour === 10) {
    const stage = stageForDate(today);
    if (stage && stage.debut === today) {
      const { data: readers } = await db.from("push_subs").select("*");
      if (readers?.length) {
        const sent = await sendTo(readers, {
          title: `Nouvelle étape : ${stage.nom}`,
          body: `Étape ${stage.n} sur 12 du voyage commence aujourd'hui.`,
          url: "/",
          tag: `stage-${stage.n}`,
        });
        actions.push(`alerte étape ${stage.n} envoyée à ${sent} abonné(s)`);
      }
    }
  }

  return NextResponse.json({ ok: true, localHour: hour, actions });
}
