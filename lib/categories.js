// Catalogue unique des catégories de dépenses : la saisie rapide de l'accueil
// et la page Budget y puisent la même liste, sinon une catégorie ajoutée d'un
// côté devient invisible de l'autre et ses montants tombent hors des jauges.
//
// L'ordre est celui de la fréquence de saisie, du geste quotidien au cas rare :
// c'est lui qui décide de la bande de boutons sur l'accueil.
export const CATEGORIES = [
  { id: "repas", label: "Repas", ic: "🍽️", color: "#C99A3B" },
  { id: "transport", label: "Transport", ic: "🚌", color: "#5C6B4C" },
  { id: "hebergement", label: "Hébergement", ic: "🛏️", color: "#BC5B2E" },
  { id: "activites", label: "Activités", ic: "🎯", color: "#3F8CA5" },
  { id: "sorties", label: "Sorties", ic: "🍸", color: "#8B5A8C" },
  { id: "courses", label: "Courses", ic: "🛒", color: "#4E8F7C" },
  { id: "autres", label: "Autres", ic: "📦", color: "#948B7E" },
];
