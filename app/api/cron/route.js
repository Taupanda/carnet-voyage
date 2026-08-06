import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "../../../lib/server";
import { stageForDate, STAGES } from "../../../lib/stages";

// Fuseau du voyage (Mexique / Amérique centrale). Réglable via TRIP_TIMEZONE.
// On dérive la date locale avec Intl → correct même en cas de changement d'heure,
// contrairement à un offset codé en dur.
const TRIP_TZ = process.env.TRIP_TIMEZONE || "America/Mexico_City";

function ymd(date) {
  // en-CA formate en AAAA-MM-JJ.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TRIP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
  const now = Date.now();
  const today = ymd(new Date(now));
  const actions = [];

  // --- Which recent days are still missing a note? ---
  const since = ymd(new Date(now - 3 * 86400000));
  const { data: recent } = await db
    .from("entries")
    .select("date")
    .gte("date", since)
    .lte("date", today);
  const written = new Set((recent || []).map((r) => r.date));

  const missing = [];
  for (let i = 0; i <= 2; i++) {
    const d = ymd(new Date(now - i * 86400000));
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

  // --- Digest hebdo (dimanche soir local) ---
  const dow = new Date(today + "T00:00:00Z").getUTCDay(); // 0 = dimanche
  if (dow === 0) {
    const monday = ymd(new Date(now - 6 * 86400000));
    const { data: weekEntries } = await db
      .from("entries").select("date").eq("status", "published").gte("date", monday).lte("date", today);
    const n = (weekEntries || []).length;
    if (n > 0) {
      const { data: recap } = await db
        .from("weekly_recaps").select("titre").eq("semaine_debut", monday).eq("status", "published").maybeSingle();
      const { data: readers } = await db.from("push_subs").select("*");
      if (readers?.length) {
        const sent = await sendTo(readers, {
          title: recap?.titre ? `Récap : ${recap.titre}` : "Le récap de la semaine",
          body: `${n} nouvelle${n > 1 ? "s" : ""} journée${n > 1 ? "s" : ""} cette semaine sur le carnet.`,
          url: recap ? "/semaines" : "/",
          tag: "digest-weekly",
        });
        actions.push(`digest hebdo envoyé à ${sent} abonné(s)`);
      }
    }
  }

  return NextResponse.json({ ok: true, localDate: today, missing, actions });
}
