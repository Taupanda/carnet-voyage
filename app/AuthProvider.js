"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabaseClient";

const Ctx = createContext({ user: null, profile: undefined, loading: true, refresh: () => {}, signOut: () => {} });
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u) => {
    if (!u) { setProfile(null); return; }
    try {
      const sb = supabaseBrowser();
      const { data } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle();
      setProfile(data || null);
    } catch (e) {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    const failsafe = setTimeout(() => setLoading(false), 3000);

    sb.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
      clearTimeout(failsafe);
    }).catch(() => { setLoading(false); clearTimeout(failsafe); });

    const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (event === "SIGNED_OUT") {
        setProfile(null);
      } else {
        await loadProfile(u);
      }
      setLoading(false);
    });

    return () => { clearTimeout(failsafe); sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(user), [user, loadProfile]);

  // déconnexion robuste : on nettoie, on ignore les erreurs, on repart propre
  const signOut = useCallback(async () => {
    try {
      await supabaseBrowser().auth.signOut();
    } catch (e) {}
    try {
      // purge défensive des jetons persistés
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch (e) {}
    window.location.replace("/");
  }, []);

  return (
    <Ctx.Provider value={{ user, profile, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
