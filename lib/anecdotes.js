// Toutes les anecdotes du voyage, sorties des posts, avec leurs étoiles.
//
// Une anecdote est une ligne de la colonne entries.anecdote (voir
// decoupeAnecdotes) : elle n'a pas d'identifiant. Une étoile la retrouve par
// sa journée et son texte, aux espaces près.
import { decoupeAnecdotes } from "./stages.js";

export const normaliser = (texte) => String(texte || "").replace(/\s+/g, " ").trim();
export const cleAnecdote = (date, texte) => `${date}|${normaliser(texte)}`;

// entries : lignes de la table (date, day_number, titre, lieux, anecdote,
// status) ; etoiles : lignes de anecdotes_etoiles (entry_date, texte).
// Rend la liste à plat, de la plus récente à la plus ancienne, dans l'ordre
// du post pour une même journée.
export function rassemblerAnecdotes(entries, etoiles = []) {
  const etoilees = new Set((etoiles || []).map((e) => cleAnecdote(e.entry_date, e.texte)));
  const out = [];
  const jours = [...(entries || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const e of jours) {
    decoupeAnecdotes(e.anecdote).forEach((texte, rang) => {
      out.push({
        date: e.date,
        day_number: e.day_number,
        titre: e.titre || "",
        lieux: Array.isArray(e.lieux) ? e.lieux : [],
        brouillon: e.status === "draft",
        rang,
        texte: normaliser(texte),
        etoile: etoilees.has(cleAnecdote(e.date, texte)),
      });
    });
  }
  return out;
}

// Recherche sans accents ni majuscules, dans le texte, le titre et les lieux.
const plat = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function filtrerAnecdotes(liste, { etoilees = false, recherche = "" } = {}) {
  const q = plat(recherche).trim();
  return liste.filter((a) =>
    (!etoilees || a.etoile) &&
    (!q || plat(`${a.texte} ${a.titre} ${a.lieux.join(" ")}`).includes(q)));
}
