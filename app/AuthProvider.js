"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabaseClient";

const Ctx = createContext({ user: null, profile: null, loading: true, refresh: () => {} });
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

    // garde-fou : quoi qu'il arrive, on ne reste jamais bloqué en chargement
    const failsafe = setTimeout(() => setLoading(false), 3000);

    // lecture locale de la session : immédiate, pas d'appel réseau bloquant
    sb.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
      clearTimeout(failsafe);
    }).catch(() => {
      setLoading(false);
      clearTimeout(failsafe);
    });

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user || null;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    });

    return () => {
      clearTimeout(failsafe);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(user), [user, loadProfile]);

  return (
    <Ctx.Provider value={{ user, profile, loading, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
