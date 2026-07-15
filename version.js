"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabaseClient";

const Ctx = createContext({
  user: null,
  profile: undefined,
  loading: true,
  refresh: () => {},
  signOut: () => {},
});
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u) => {
    if (!u) { setProfile(null); return; }
    try {
      const { data } = await supabaseBrowser()
        .from("profiles").select("*").eq("id", u.id).maybeSingle();
      setProfile(data || null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    const failsafe = setTimeout(() => setLoading(false), 3000);

    sb.auth.getSession()
      .then(({ data }) => {
        const u = data.session?.user || null;
        setUser(u);
        setLoading(false);
        clearTimeout(failsafe);
        loadProfile(u);
      })
      .catch(() => { setLoading(false); clearTimeout(failsafe); });

    /* RÈGLE CRITIQUE : ne JAMAIS faire d'appel Supabase (await inclus)
       directement dans ce callback — la librairie détient un verrou interne
       pendant son exécution, et tout appel imbriqué provoque un interblocage
       qui fige toutes les requêtes suivantes. On diffère donc via setTimeout. */
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;
      setUser(u);
      setLoading(false);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        return;
      }
      setTimeout(() => { loadProfile(u); }, 0);
    });

    return () => { clearTimeout(failsafe); sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(user), [user, loadProfile]);

  const signOut = useCallback(async () => {
    // garde-fou : même si l'appel réseau traîne, on part quand même
    const hardExit = setTimeout(() => {
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {}
      window.location.replace("/");
    }, 1500);
    try { await supabaseBrowser().auth.signOut(); } catch {}
    clearTimeout(hardExit);
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {}
    window.location.replace("/");
  }, []);

  return (
    <Ctx.Provider value={{ user, profile, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
