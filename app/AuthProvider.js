"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabaseClient";

const Ctx = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u) => {
    if (!u) {
      setProfile(null);
      return;
    }
    const sb = supabaseBrowser();
    const { data } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getUser().then(async ({ data }) => {
      setUser(data.user || null);
      await loadProfile(data.user);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, session) => {
      setUser(session?.user || null);
      await loadProfile(session?.user);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(user), [user, loadProfile]);

  return (
    <Ctx.Provider value={{ user, profile, loading, refresh, setProfile }}>
      {children}
    </Ctx.Provider>
  );
}
