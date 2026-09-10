"use client";
import { createContext, useContext } from "react";
import { useAuth } from "./AuthProvider";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

const Ctx = createContext({ isAdmin: false, adminView: false });
export const useMode = () => useContext(Ctx);

// Il existait deux modes pour l'auteur, « éditeur » et « utilisateur », avec une
// bascule à activer pour voir ses propres outils. La navigation est désormais la
// même pour tout le monde : l'auteur voit simplement des actions en plus, là où
// elles servent. `adminView` est conservé — plusieurs composants s'en servent —
// mais il vaut maintenant exactement « je suis l'auteur ».
export default function ModeProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;
  return <Ctx.Provider value={{ isAdmin, adminView: isAdmin }}>{children}</Ctx.Provider>;
}
