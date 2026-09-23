import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin, checkAdmin, callClaude, extractJson } from "../../../lib/server";
import { destinatairesRecap, recapEnHtml, envoyerRecap, envoiEmailDispo } from "../../../lib/courriel";
import { chiffresSemaine, miseEnPageDepuisIA, miseEnPageDepuisEditeur, contenuTexte, photosDuJour } from "../../../lib/recap";

// Les adresses vivent dans auth.users, pas dans profiles : il faut la liste des
// comptes. Paginée, sinon seuls les cinquante premiers sortent.
async function adressesDesComptes(db, ids) {
  const voulus = new Set(ids || []);
  const out = {};
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data?.users || []) if (voulus.has(u.id) && u.email) out[u.id] = u.email;
    if ((data?.users || []).length < 200) break;
  }
  return out;
}

// Lundi (AAAA-MM-JJ) de la semaine contenant `dateStr`.
function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Les posts publiés de la semaine, sans la réflexion : elle peut être privée, et
// ni l'IA ni un e-mail n'en ont besoin.
async function postsDeLaSemaine(db, lundi) {
  const { data, error } = await db
    .from("entries")
    .select("*")
    .eq("status", "published")
    .gte("date", lundi)
    .lte("date", addDays(lundi, 6))
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(({ reflexion, reflexion_privee, ...e }) => e);
}

const lienSemaine = (base, lundi) => `${base}/semaines/${lundi}`;

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  // Les photos de la semaine, pour choisir couverture et illustrations.
  const photos = new URL(request.url).searchParams.get("photos");
  if (photos) {
    try {
      const posts = await postsDeLaSemaine(db, mondayOf(photos));
      return NextResponse.json(posts.map((e) => ({ date: e.date, titre: e.titre, photos: photosDuJour(e) })));
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  const { data, error } = await db.from("weekly_recaps").select("*").order("semaine_debut", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const db = supabaseAdmin();

  // --- Envoyer le récap : notification, e-mail, ou les deux (le publie aussi) ---
  if (body.action === "send") {
    const { data: recap } = await db.from("weekly_recaps").select("*").eq("id", body.id).single();
    if (!recap) return NextResponse.json({ error: "résumé introuvable" }, { status: 404 });

    // Les canaux sont demandés explicitement : envoyer sur les deux par défaut
    // enverrait deux fois à ceux qui ont choisi l'un des deux.
    const canaux = Array.isArray(body.canaux) && body.canaux.length ? body.canaux : ["push"];
    const veutPush = canaux.includes("push");
    const veutEmail = canaux.includes("email");

    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const resultat = { push: null, email: null };

    await db.from("weekly_recaps").update({ status: "published", updated_at: new Date().toISOString() }).eq("id", recap.id);

    // --- Notifications ---
    if (veutPush) {
      if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        resultat.push = { envoyes: 0, echecs: 0, raison: "VAPID non configuré" };
      } else {
        webpush.setVapidDetails("mailto:carnet@voyage.app", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
        const { data: subs } = await db.from("push_subs").select("*");
        // Un compte bloqué ne doit plus rien recevoir. Les abonnements sans
        // compte (visiteur non connecté) restent servis.
        const { data: bloques } = await db.from("profiles").select("id").eq("bloque", true);
        const exclus = new Set((bloques || []).map((p) => p.id));
        const cibles = (subs || []).filter((s) => !s.user_id || !exclus.has(s.user_id));

        const txt = (recap.contenu || "").replace(/\s+/g, " ").trim();
        const payload = JSON.stringify({
          title: recap.titre || "Le récap de la semaine",
          body: txt.slice(0, 120) + (txt.length > 120 ? "…" : ""),
          url: `/semaines/${recap.semaine_debut}`,
          tag: `recap-${recap.id}`,
        });
        const results = await Promise.allSettled(
          cibles.map((s) =>
            webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
          )
        );
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r.status === "rejected" && [404, 410].includes(r.reason?.statusCode)) {
            await db.from("push_subs").delete().eq("endpoint", cibles[i].endpoint);
          }
        }
        const envoyes = results.filter((r) => r.status === "fulfilled").length;
        resultat.push = { envoyes, echecs: results.length - envoyes };
      }
    }

    // --- E-mails ---
    if (veutEmail) {
      if (!envoiEmailDispo()) {
        resultat.email = { envoyes: 0, echecs: 0, raison: "envoi d'e-mail non configuré (RESEND_API_KEY, EMAIL_FROM)" };
      } else {
        const { data: profils } = await db.from("profiles").select("id, prenom, recap_email, bloque");
        const adresses = await adressesDesComptes(db, (profils || []).map((p) => p.id));
        const destinataires = destinatairesRecap(profils, adresses);
        const posts = await postsDeLaSemaine(db, recap.semaine_debut).catch(() => []);
        const html = recapEnHtml(recap, {
          lien: lienSemaine(base, recap.semaine_debut),
          lienDesabo: `${base}/profil`,
          chiffres: chiffresSemaine(posts),
        });
        resultat.email = await envoyerRecap(destinataires, {
          sujet: recap.titre || "Le récap de la semaine",
          html,
        });
      }
    }

    return NextResponse.json({ ok: true, ...resultat });
  }

  // --- Aperçu de l'e-mail, sur le résumé tel qu'il est à l'écran ---
  if (body.action === "apercu") {
    const lundi = body.semaine_debut ? mondayOf(body.semaine_debut) : null;
    if (!lundi) return NextResponse.json({ error: "semaine_debut requise" }, { status: 400 });
    const posts = await postsDeLaSemaine(db, lundi).catch(() => []);
    const recap = {
      semaine_debut: lundi,
      titre: body.titre,
      contenu: body.contenu,
      mise_en_page: body.mise_en_page ? miseEnPageDepuisEditeur(body.mise_en_page, posts) : null,
    };
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const html = recapEnHtml(recap, { lien: lienSemaine(base, lundi), lienDesabo: `${base}/profil`, chiffres: chiffresSemaine(posts) });
    return NextResponse.json({ html });
  }

  // --- Générer un brouillon depuis les posts de la semaine ---
  if (body.action === "generate") {
    if (!body.semaine) return NextResponse.json({ error: "semaine requise" }, { status: 400 });
    const lundi = mondayOf(body.semaine);
    const dimanche = addDays(lundi, 6);

    let entries;
    try { entries = await postsDeLaSemaine(db, lundi); } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
    if (!entries.length) {
      return NextResponse.json({ error: "Aucun post publié cette semaine." }, { status: 400 });
    }

    // Les activités avec leur détail, un peu tronqué : de quoi écrire des
    // chapitres concrets sans envoyer tout le carnet.
    const brief = entries
      .map((e) => {
        const lieux = Array.isArray(e.lieux) ? e.lieux.join(", ") : "";
        const acts = (Array.isArray(e.recit) ? e.recit : [])
          .filter((r) => r?.activite)
          .map((r) => `  · ${r.activite}${r.detail ? ` — ${String(r.detail).replace(/\s+/g, " ").slice(0, 280)}` : ""}`)
          .join("\n");
        return `${e.date} · ${e.titre || ""}${lieux ? ` (${lieux})` : ""}${acts ? `\n${acts}` : ""}`;
      })
      .join("\n");

    const system = `Tu écris le résumé hebdomadaire d'un carnet de voyage (Mexique / Amérique centrale), à la PREMIÈRE PERSONNE ("je"), au masculin, pour les proches qui suivent le voyage.
- Ton chaleureux mais SOBRE et factuel. Aucune emphase inventée, aucun lyrisme ("magique", "inoubliable"…), tu restes fidèle aux faits fournis.
- Une accroche d'une ou deux phrases qui donne la couleur de la semaine.
- Puis 2 à 4 chapitres courts qui suivent la semaine dans l'ordre (un lieu, un moment, une étape), pas un jour-par-jour exhaustif. Chaque chapitre : un titre de 2 à 5 mots, 1 ou 2 courts paragraphes (séparés par une ligne vide), et les dates (AAAA-MM-JJ) des jours qu'il couvre, prises dans la liste fournie.
- N'invente aucun détail absent des notes.
Réponds UNIQUEMENT en JSON valide, sans markdown :
{"titre": "titre court de la semaine (4-8 mots)", "chapeau": "l'accroche", "sections": [{"titre": "…", "texte": "…", "jours": ["AAAA-MM-JJ"]}]}`;

    let raw;
    try {
      raw = await callClaude(system, [
        { role: "user", content: `Semaine du ${lundi} au ${dimanche}. Posts publiés :\n${brief}` },
      ], 2000);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    let parsed;
    try { parsed = extractJson(raw); } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }

    const miseEnPage = miseEnPageDepuisIA(parsed, entries);
    const { data: saved, error: upErr } = await db
      .from("weekly_recaps")
      .upsert({
        semaine_debut: lundi,
        titre: String(parsed.titre || "").trim() || null,
        contenu: contenuTexte(miseEnPage) || null,
        mise_en_page: miseEnPage,
        status: "draft",
        updated_at: new Date().toISOString(),
      }, { onConflict: "semaine_debut" })
      .select()
      .single();
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json(saved);
  }

  // --- Enregistrer / publier / dépublier ---
  if (!body.semaine_debut && !body.id) {
    return NextResponse.json({ error: "semaine_debut ou id requis" }, { status: 400 });
  }
  const row = {
    ...(body.id ? { id: body.id } : {}),
    ...(body.semaine_debut ? { semaine_debut: body.semaine_debut } : {}),
    titre: body.titre ?? null,
    contenu: body.contenu ?? null,
    status: body.status === "published" ? "published" : "draft",
    updated_at: new Date().toISOString(),
  };
  // Résumé illustré : les photos sont vérifiées contre celles de la semaine, et
  // la version texte est recalculée pour rester fidèle à ce qui est affiché.
  if (body.mise_en_page) {
    const lundi = body.semaine_debut ? mondayOf(body.semaine_debut) : null;
    if (!lundi) return NextResponse.json({ error: "semaine_debut requise" }, { status: 400 });
    let posts;
    try { posts = await postsDeLaSemaine(db, lundi); } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
    row.mise_en_page = miseEnPageDepuisEditeur(body.mise_en_page, posts);
    row.contenu = contenuTexte(row.mise_en_page) || null;
  }
  const { data, error } = await db
    .from("weekly_recaps")
    .upsert(row, { onConflict: body.id ? "id" : "semaine_debut" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  const { error } = await supabaseAdmin().from("weekly_recaps").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
