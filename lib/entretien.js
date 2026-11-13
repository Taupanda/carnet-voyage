// L'entretien du soir ne renvoie que les champs modifiés à chaque tour : sur
// une journée très riche, réécrire tous les champs à chaque réponse finissait
// par dépasser la longueur permise (« journée très longue »). On recompose
// ici l'état complet. Un champ vide ou null ne peut pas effacer ce qui était
// déjà noté.
export function fusionnerExtraits(avant, modifies) {
  const complet = { ...(avant || {}) };
  for (const [k, v] of Object.entries(modifies || {})) {
    if (v !== null && v !== undefined && String(v).trim() !== "") complet[k] = v;
  }
  return complet;
}
