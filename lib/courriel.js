// Envoi d'e-mails, via l'API REST de Resend.
//
// Appel direct par fetch plutôt qu'une librairie : une seule requête HTTP, pas
// de dépendance de plus à suivre. Sans clé configurée, rien n'est envoyé et on
// le dit — un récap qui part à moitié serait pire qu'un refus franc.

const API = "https://api.resend.com/emails";
const LOT_MAX = 100; // limite de l'envoi groupé chez Resend

export function envoiEmailDispo() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

// Échappe ce qui part dans le HTML. Le contenu vient de l'auteur, mais un
// prénom vient d'un visiteur : il n'a rien à faire dans le balisage.
export function echappe(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Découpe en lots : l'API refuse au-delà de cent destinataires par appel.
export function lotsDe(liste, taille = LOT_MAX) {
  const out = [];
  for (let i = 0; i < (liste || []).length; i += taille) out.push(liste.slice(i, i + taille));
  return out;
}

// Qui reçoit le récap par e-mail : abonné, non bloqué, et avec une adresse.
// Les trois conditions comptent — un compte bloqué ne doit pas continuer à
// recevoir le carnet, et un profil sans adresse ferait échouer tout le lot.
export function destinatairesRecap(profils, emails = {}) {
  const vus = new Set();
  return (profils || [])
    .filter((p) => p && p.recap_email && !p.bloque)
    .map((p) => ({ id: p.id, prenom: p.prenom || "", email: (emails[p.id] || "").trim().toLowerCase() }))
    .filter((d) => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return false;
      if (vus.has(d.email)) return false; // deux comptes, une adresse : un seul envoi
      vus.add(d.email);
      return true;
    });
}

// Le récap en HTML. Volontairement sobre : tableaux et styles en ligne, seul
// dialecte que les clients de messagerie rendent de la même façon.
export function recapEnHtml(recap, { lien, lienDesabo } = {}) {
  const titre = echappe(recap?.titre || "Le récap de la semaine");
  const paragraphes = String(recap?.contenu || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.65;color:#2A241E;font-size:15px">${echappe(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F5F0E8;padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFBF5;border-radius:14px;border:1px solid #E5DCCE">
<tr><td style="padding:26px 26px 8px">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#BC5B2E;font-weight:700">Les aventures de Maxou</p>
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#211D17">${titre}</h1>
${paragraphes}
${lien ? `<p style="margin:22px 0 0"><a href="${echappe(lien)}" style="display:inline-block;background:#BC5B2E;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600">Lire sur le carnet</a></p>` : ""}
</td></tr>
<tr><td style="padding:20px 26px 24px;color:#948B7E;font-size:11.5px;line-height:1.6">
${lienDesabo ? `Tu reçois ce message parce que tu t'es abonné au récap hebdomadaire. <a href="${echappe(lienDesabo)}" style="color:#948B7E">Se désabonner</a>.` : ""}
</td></tr></table></body></html>`;
}

// Envoi groupé. Ne lève jamais : rend le détail, pour pouvoir dire combien sont
// partis et lesquels ont échoué plutôt qu'un simple « erreur ».
export async function envoyerRecap(destinataires, { sujet, html }) {
  if (!envoiEmailDispo()) {
    return { envoyes: 0, echecs: destinataires.length, raison: "RESEND_API_KEY ou EMAIL_FROM non configuré" };
  }
  let envoyes = 0;
  const erreurs = [];
  for (const lot of lotsDe(destinataires)) {
    // Un envoi par destinataire : une liste dans « to » exposerait les adresses
    // des abonnés les unes aux autres.
    const resultats = await Promise.allSettled(
      lot.map((d) =>
        fetch(API, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [d.email], subject: sujet, html }),
        }).then(async (r) => {
          if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
          return true;
        })
      )
    );
    resultats.forEach((r, i) => {
      if (r.status === "fulfilled") envoyes++;
      else erreurs.push({ email: lot[i].email, raison: r.reason?.message || "échec" });
    });
  }
  return { envoyes, echecs: erreurs.length, erreurs: erreurs.slice(0, 10) };
}
