"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

const Ctx = createContext({ mode: "user", setMode: () => {}, isAdmin: false, adminView: false });
export const useMode = () => useContext(Ctx);

// Deux modes pour l'admin : "editeur" (outils visibles) et "utilisateur" (aperçu
// du site tel qu'un invité le voit). Les invités sont toujours en "user".
export default function ModeProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;
  const [mode, setModeState] = useState("user");

  useEffect(() => {
    if (!isAdmin) { setModeState("user"); return; }
    let saved = null;
    try { saved = localStorage.getItem("carnet-mode"); } catch {}
    setModeState(saved === "user" ? "user" : "editor"); // admin : éditeur par défaut
  }, [isAdmin]);

  const setMode = (m) => {
    setModeState(m);
    try { localStorage.setItem("carnet-mode", m); } catch {}
  };

  const adminView = isAdmin && mode === "editor";
  return <Ctx.Provider value={{ mode, setMode, isAdmin, adminView }}>{children}</Ctx.Provider>;
}
