"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import PushButton from "../PushButton";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { fetchMeteo } from "../../lib/weather";
import RencontresManager from "./RencontresManager";

const KIFF = ["😑", "🙂", "😊", "🤩", "🥳"];
const AVENTURE = ["🛋️", "🚶", "🧗", "🏄", "🌋"];
const EMOJIS = ["😄", "🥰", "😌", "🤩", "😴", "😭", "🤯", "😤", "🥵", "🤒", "🌞", "🌧️", "💃", "🧘", "🍹", "🏖️"];
const TRIP_START = new Date("2026-09-08T00:00:00");

const emptyExtracted = () => ({ lieu: null, activites: null, rencontres: null, anecdote: null, adresse: null, reflexion: null, photos: null });
const todayStr = () => new Date().toISOString().slice(0, 10);
const dayNumber = (d) => Math.round((new Date(d + "T00:00:00") - TRIP_START) / 86400000);

async function api(path, opts = {}) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
}

export default function Journal() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
  const [phase, setPhase] = useState("date");
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [extracted, setExtracted] = useState(emptyExtracted());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState([]); // array of URLs
  const [noteHumeur, setNoteHumeur] = useState(3);
  const [noteEnergie, setNoteEnergie] = useState(3);
  const [noteSociale, setNoteSociale] = useState(3);
  const [noteAventure, setNoteAventure] = useState(3);
  const [hebergement, setHebergement] = useState("");
  const [photoPrincipale, setPhotoPrincipale] = useState(null);
  const [reflexionPrivee, setReflexionPrivee] = useState(false);
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [showRencontres, setShowRencontres] = useState(false);
  const [allRencontres, setAllRencontres] = useState([]);
  const [linkedRencontres, setLinkedRencontres] = useState([]);
  const [quickRenc, setQuickRenc] = useState(null);
  const [exporting, setExporting] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const listRes = await api("/api/entries");
      if (listRes.ok) setEntries(await listRes.json());
      const inboxRes = await api("/api/inbox");
      if (inboxRes.ok) setInbox(await inboxRes.json());
      const cmtRes = await api("/api/comments");
      if (cmtRes.ok) setComments(await cmtRes.json());
    })();
  }, [isAdmin]);

  // ouverture automatique d'un panneau via ?panel=
  useEffect(() => {
    if (!isAdmin) return;
    const p = new URLSearchParams(window.location.search).get("panel");
    if (p === "rencontres") setShowRencontres(true);
    else if (p === "comments") setShowComments(true);
  }, [isAdmin]);

  function startInterview() {
    setMessages([{ role: "assistant", content: "Alors, cette journée ? Raconte-moi comme tu veux, dans l'ordre que tu veux — je remets tout en forme après." }]);
    setExtracted(emptyExtracted());
    setPhotos([]);
    setNoteHumeur(3);
    setNoteEnergie(3);
    setNoteSociale(3);
    setNoteAventure(3);
    setHebergement("");
    setPhotoPrincipale(null);
    setReflexionPrivee(false);
    setLinkedRencontres([]);
    setPost(null);
    setError(null);
    setPhase("chat");
  }

  async function loadLinkedRencontres(d) {
    try {
      const [allRes, linkRes] = await Promise.all([
        api("/api/rencontres"),
        api(`/api/entry-rencontres?date=${d}`),
      ]);
      if (allRes.ok) setAllRencontres(await allRes.json());
      if (linkRes.ok) {
        const linked = await linkRes.json();
        setLinkedRencontres(linked.map((r) => r.id));
      }
    } catch {}
  }

  async function createQuickRenc() {
    if (!quickRenc?.prenom.trim()) return;
    setLoading(true);
    try {
      const res = await api("/api/rencontres", { method: "POST", body: JSON.stringify(quickRenc) });
      if (res.ok) {
        const saved = await res.json();
        setAllRencontres((rs) => [saved, ...rs]);
        setLinkedRencontres((ids) => [...ids, saved.id]);
        setQuickRenc(null);
      }
    } catch {}
    setLoading(false);
  }

  function openDate(d) {
    setDate(d);
    setError(null);
    const existing = entries.find((e) => e.date === d);
    if (existing) {
      setExtracted(existing.raw_extracted || emptyExtracted());
      setNoteHumeur(existing.note_humeur ?? 3);
      setNoteEnergie(existing.note_energie ?? 3);
      setNoteSociale(existing.note_sociale ?? 3);
      setNoteAventure(existing.note_aventure ?? 3);
      setHebergement(existing.hebergement || "");
      setPhotoPrincipale(existing.photo_principale || null);
      setReflexionPrivee(!!existing.reflexion_privee);
      setPhotos(existing.photos || []);
      loadLinkedRencontres(d);
      setPost({
        titre: existing.titre,
        lieux: existing.lieux,
        coords: existing.lat ? { lat: existing.lat, lng: existing.lng } : null,
        recit: existing.recit,
        rencontres: existing.rencontres,
        anecdote: existing.anecdote,
        adresse: existing.adresse,
        reflexion: existing.reflexion,
      });
      setPhase("summary");
    } else {
      startInterview();
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setError(null);
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await api("/api/interview", { method: "POST", body: JSON.stringify({ history: newMessages, extracted, photoCount: photos.length }) });
      if (!res.ok) throw new Error("api");
      const parsed = await res.json();
      setExtracted((prev) => ({ ...prev, ...parsed.extracted }));
      setMessages((m) => [...m, { role: "assistant", content: parsed.reply }]);
      if (parsed.done) {
        api("/api/rencontres").then((r) => r.ok && r.json().then(setAllRencontres)).catch(() => {});
        setTimeout(() => setPhase("moods"), 600);
      }
    } catch (e) {
      setError("Petit souci de connexion — réessaie d'envoyer ton message.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("date", date);
      try {
        const res = await api("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("upload");
        const { url } = await res.json();
        setPhotos((p) => [...p, url]);
      } catch (err) {
        setError("Échec de l'envoi d'une photo — réessaie.");
      }
    }
  }

  function toggleRecording() {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("La dictée n'est pas disponible sur ce navigateur — utilise le micro du clavier.");
      return;
    }
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setInput((prev) => (prev.replace(/\u200b.*$/, "") + finalText + "\u200b" + interim).trimStart());
    };
    rec.onend = () => {
      setRecording(false);
      setInput((p) => p.replace(/\u200b/g, ""));
    };
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    setError(null);
    rec.start();
    setRecording(true);
  }

  async function generatePost() {
    setLoading(true);
    setError(null);
    try {
      const res = await api("/api/format", { method: "POST", body: JSON.stringify({ extracted, date }) });
      if (!res.ok) throw new Error("api");
      setPost(await res.json());
      setPhase("summary");
    } catch (e) {
      setError("Impossible de générer le post, réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry(status) {
    setLoading(true);
    setError(null);
    const entry = {
      date,
      day_number: dayNumber(date),
      titre: post.titre,
      lieux: post.lieux,
      lat: post.coords?.lat ?? null,
      lng: post.coords?.lng ?? null,
      recit: post.recit,
      rencontres: post.rencontres,
      anecdote: post.anecdote,
      adresse: post.adresse,
      reflexion: post.reflexion,
      reflexion_privee: reflexionPrivee,
      note_humeur: noteHumeur,
      note_energie: noteEnergie,
      note_sociale: noteSociale,
      note_aventure: noteAventure,
      hebergement: hebergement.trim() || null,
      photo_principale: photoPrincipale || photos[0] || null,
      photos,
      raw_extracted: extracted,
      status,
    };
    // météo automatique à partir des coordonnées du lieu
    if (post.coords?.lat) {
      try {
        const m = await fetchMeteo(post.coords.lat, post.coords.lng, date);
        if (m) entry.meteo = m;
      } catch {}
    }
    try {
      const res = await api("/api/entries", { method: "POST", body: JSON.stringify(entry) });
      if (!res.ok) throw new Error((await res.json()).error);
      const saved = await res.json();
      // enregistrer les liaisons rencontres
      try {
        await api("/api/entry-rencontres", {
          method: "POST",
          body: JSON.stringify({ entry_date: date, rencontre_ids: linkedRencontres }),
        });
      } catch {}
      setEntries((es) => [saved, ...es.filter((x) => x.date !== date)].sort((a, b) => (a.date < b.date ? 1 : -1)));
      setPhase("saved");
    } catch (e) {
      setError("Échec de l'enregistrement : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry() {
    if (!confirm("Supprimer définitivement cette journée ?")) return;
    try {
      await api("/api/entries", { method: "DELETE", body: JSON.stringify({ date }) });
      setEntries((es) => es.filter((x) => x.date !== date));
      setPhase("date");
    } catch (e) {
      setError("Échec de la suppression.");
    }
  }

  const dNum = dayNumber(date);

  async function exportData() {
    setExporting(true);
    setError(null);
    try {
      const res = await api("/api/export");
      if (!res.ok) throw new Error("export refusé");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carnet-export-${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Export impossible : " + e.message);
    } finally {
      setExporting(false);
    }
  }

  async function deleteComment(id) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    const res = await api("/api/comments", { method: "DELETE", body: JSON.stringify({ id }) });
    if (res.ok) setComments((cs) => cs.filter((c) => c.id !== id));
  }

  if (authLoading) {
    return (
      <main className="container" style={{ paddingTop: 60 }}>
        <p className="empty">Vérification…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>Mode éditeur</h1>
        <p style={{ color: "var(--text2)", marginBottom: 18 }}>Connecte-toi avec ton compte pour continuer.</p>
        <Link href="/connexion" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>Se connecter</Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>Mode éditeur</h1>
        <p style={{ color: "var(--text2)", marginBottom: 18 }}>
          Cet espace est réservé à l'auteur du carnet.
        </p>
        <Link href="/" className="btn-secondary" style={{ display: "inline-block", textDecoration: "none" }}>← Retour au carnet</Link>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 560, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "var(--bg2)" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px dashed var(--gold)", color: "var(--gold)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span className="serif" style={{ fontSize: 16, fontWeight: 700 }}>{dNum >= 0 ? dNum : "—"}</span>
          <span style={{ fontSize: 7, textTransform: "uppercase" }}>{dNum >= 0 ? "jour" : "avant"}</span>
        </div>
        <div>
          <div className="serif" style={{ fontSize: 16 }}>Carnet de bord</div>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>
            {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <Link href="/" className="btn-secondary" style={{ marginLeft: "auto", padding: "8px 12px", fontSize: 13, textDecoration: "none" }}>
          ← Site
        </Link>
        <Link href="/budget" className="btn-secondary" style={{ padding: "8px 12px", fontSize: 13, textDecoration: "none" }}>
          💰 Budget
        </Link>
        {phase !== "date" && (
          <button className="btn-secondary" style={{ padding: "8px 12px", fontSize: 13 }} onClick={() => setPhase("date")}>
            Calendrier
          </button>
        )}
      </header>

      {phase === "date" && !showInbox && !showComments && !showRencontres && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="serif" style={{ fontSize: 19 }}>Quelle journée veux-tu raconter ?</h2>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Un point doré = une note existe déjà (tape pour la modifier).</p>
          <MiniCalendar date={date} onSelect={openDate} entryDates={entries.map((e) => e.date)} entries={entries} />
          {error && <p className="error">{error}</p>}

          <div style={{ marginTop: 4 }}>
            <p className="lbl" style={{ marginBottom: 10 }}>Back-office</p>
            <div className="bo-tiles">
              <button className="bo-tile" onClick={() => setShowRencontres(true)}>
                <span className="bo-tile-ic">🤝</span>
                <span className="bo-tile-label">Rencontres</span>
              </button>
              <a className="bo-tile" href="/budget">
                <span className="bo-tile-ic">💰</span>
                <span className="bo-tile-label">Budget</span>
              </a>
              <a className="bo-tile" href="/workout">
                <span className="bo-tile-ic">💪</span>
                <span className="bo-tile-label">Workout</span>
              </a>
              <button className="bo-tile" onClick={() => setShowComments(true)}>
                <span className="bo-tile-ic">💬</span>
                <span className="bo-tile-label">Commentaires</span>
                {comments.length > 0 && <span className="bo-tile-badge">{comments.length}</span>}
              </button>
              <button className="bo-tile" onClick={() => setShowInbox(true)}>
                <span className="bo-tile-ic">✉️</span>
                <span className="bo-tile-label">Mots reçus</span>
                {inbox.filter((m) => !m.lu).length > 0 && <span className="bo-tile-badge">{inbox.filter((m) => !m.lu).length}</span>}
              </button>
              <button className="bo-tile" onClick={exportData} disabled={exporting}>
                <span className="bo-tile-ic">⬇️</span>
                <span className="bo-tile-label">{exporting ? "..." : "Export"}</span>
              </button>
            </div>
          </div>

          <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
              Rappel chaque soir à 20h, et le lendemain soir si la journée est encore vide.
            </p>
            <PushButton role="admin" label="Activer mes rappels" labelDone="Rappels activés ✓" />
          </div>
        </div>
      )}

      {showRencontres && <RencontresManager onClose={() => setShowRencontres(false)} />}

      {showComments && (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <h2 className="serif" style={{ fontSize: 19 }}>Commentaires</h2>
            <button className="btn-secondary" style={{ marginLeft: "auto", padding: "8px 14px" }} onClick={() => setShowComments(false)}>
              Fermer
            </button>
          </div>
          {comments.length === 0 && <p className="empty">Aucun commentaire pour l'instant.</p>}
          {comments.map((c) => (
            <div key={c.id} className="pm">
              <div className="pm-head">
                {c.profiles?.avatar_url ? (
                  <img src={c.profiles.avatar_url} alt="" className="avatar" />
                ) : (
                  <span className="avatar avatar-fallback">{(c.profiles?.prenom || "?")[0]?.toUpperCase()}</span>
                )}
                <b>{c.profiles?.prenom || "Quelqu'un"} {c.profiles?.nom || ""}</b>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                  jour du {new Date(c.entry_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p style={{ color: "var(--text2)", fontSize: 14.5, marginTop: 6 }}>{c.contenu}</p>
              <button
                className="btn-danger"
                style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                onClick={() => deleteComment(c.id)}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      {showInbox && (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <h2 className="serif" style={{ fontSize: 19 }}>Mots reçus</h2>
            <button className="btn-secondary" style={{ marginLeft: "auto", padding: "8px 14px" }} onClick={() => setShowInbox(false)}>
              Fermer
            </button>
          </div>
          {inbox.length === 0 && <p className="empty">Aucun mot pour l'instant.</p>}
          {inbox.map((m) => (
            <div key={m.id} className="pm" style={{ opacity: m.lu ? 0.6 : 1 }}>
              <div className="pm-head">
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} alt="" className="avatar" />
                ) : (
                  <span className="avatar avatar-fallback">{(m.profiles?.prenom || "?")[0]?.toUpperCase()}</span>
                )}
                <b>{m.profiles?.prenom} {m.profiles?.nom}</b>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                  {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p style={{ color: "var(--text2)", fontSize: 14.5, marginTop: 6 }}>{m.contenu}</p>
              {!m.lu && (
                <button
                  className="btn-secondary"
                  style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                  onClick={async () => {
                    await api("/api/inbox", { method: "POST", body: JSON.stringify({ id: m.id }) });
                    setInbox((ms) => ms.map((x) => (x.id === m.id ? { ...x, lu: true } : x)));
                  }}
                >
                  Marquer comme lu
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {phase === "chat" && (
        <>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div
                  style={{
                    background: m.role === "user" ? "var(--pink)" : "var(--bg3)",
                    color: m.role === "user" ? "#fff" : "var(--text)",
                    padding: "10px 14px",
                    borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    maxWidth: "82%",
                    fontSize: 14.5,
                    lineHeight: 1.5,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ color: "var(--muted)", fontSize: 13 }}><span className="spin">⏳</span></div>}
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {photos.map((url, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                    <button
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--pink)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <p className="error" style={{ margin: "0 12px 8px" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid var(--line)", background: "var(--bg2)" }}>
            <button className="btn-secondary" style={{ padding: 10, width: 42 }} onClick={() => fileRef.current?.click()} aria-label="Photos">📷</button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handlePhotos} />
            <button
              className="btn-secondary"
              style={{ padding: 10, width: 42, ...(recording ? { background: "var(--pink)", borderColor: "var(--pink)" } : {}) }}
              onClick={toggleRecording}
              aria-label="Dicter"
            >
              🎙️
            </button>
            <input
              className="input"
              style={{ flex: 1 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={recording ? "Je t'écoute…" : "Raconte…"}
            />
            <button className="btn" style={{ padding: "10px 16px" }} onClick={handleSend} disabled={loading}>➤</button>
          </div>
        </>
      )}

      {phase === "moods" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 className="serif" style={{ fontSize: 19 }}>Comment était cette journée ?</h2>
          <NoteScale label="😊 Humeur" value={noteHumeur} onChange={setNoteHumeur} />
          <NoteScale label="⚡ Énergie" value={noteEnergie} onChange={setNoteEnergie} />
          <NoteScale label="🤝 Sociale" value={noteSociale} onChange={setNoteSociale} />
          <NoteScale label="🌋 Aventure" value={noteAventure} onChange={setNoteAventure} />

          <div>
            <label className="lbl">🛏️ Où as-tu dormi ?</label>
            <input className="input" value={hebergement} onChange={(e) => setHebergement(e.target.value)} placeholder="Nom de l'hôtel, hostel, Airbnb…" />
          </div>

          <div>
            <label className="lbl">🤝 Rencontres du jour</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allRencontres.map((r) => {
                const on = linkedRencontres.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      setLinkedRencontres((ids) =>
                        on ? ids.filter((x) => x !== r.id) : [...ids, r.id]
                      )
                    }
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                      border: "1.5px solid " + (on ? "var(--accent)" : "var(--line2)"),
                      background: on ? "var(--accent)" : "var(--card)",
                      color: on ? "#fff" : "var(--ink2)", fontSize: 13,
                    }}
                  >
                    {r.photo_url && <img src={r.photo_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />}
                    {r.prenom} {r.nom || ""}
                  </button>
                );
              })}
            </div>
            {quickRenc ? (
              <div style={{ marginTop: 10, padding: 12, border: "1.5px solid var(--accent)", borderRadius: 12, background: "var(--card)" }}>
                <input className="input" placeholder="Prénom *" value={quickRenc.prenom} onChange={(e) => setQuickRenc({ ...quickRenc, prenom: e.target.value })} style={{ marginBottom: 8 }} autoFocus />
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input className="input" placeholder="Pays" value={quickRenc.pays} onChange={(e) => setQuickRenc({ ...quickRenc, pays: e.target.value })} />
                  <input className="input" placeholder="Lieu" value={quickRenc.lieu_rencontre} onChange={(e) => setQuickRenc({ ...quickRenc, lieu_rencontre: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setQuickRenc(null)}>Annuler</button>
                  <button className="btn" style={{ flex: 1 }} onClick={createQuickRenc} disabled={loading || !quickRenc.prenom.trim()}>Créer & lier</button>
                </div>
              </div>
            ) : (
              <button
                className="btn-secondary"
                style={{ marginTop: 8, padding: "8px 14px", fontSize: 13 }}
                onClick={() => setQuickRenc({ prenom: "", pays: "", lieu_rencontre: "" })}
              >
                + Nouvelle personne
              </button>
            )}
          </div>

          {photos.length > 0 && (
            <div>
              <label className="lbl">Photo principale (en tête du post)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 6 }}>
                {photos.map((url, i) => (
                  <button key={i} onClick={() => setPhotoPrincipale(url)} style={{ position: "relative", padding: 0, border: "none", cursor: "pointer", borderRadius: 8, overflow: "hidden", outline: (photoPrincipale || photos[0]) === url ? "3px solid var(--accent)" : "none" }}>
                    <img src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                    {(photoPrincipale || photos[0]) === url && (
                      <span style={{ position: "absolute", top: 3, right: 3, background: "var(--accent)", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 4, fontFamily: "Space Mono, monospace" }}>★</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {extracted.reflexion && extracted.reflexion !== "rien" && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--muted)" }}>
              <input type="checkbox" checked={reflexionPrivee} onChange={(e) => setReflexionPrivee(e.target.checked)} style={{ width: 18, height: 18 }} />
              Garder ma réflexion privée (invisible sur le blog)
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn" style={{ marginTop: "auto" }} onClick={generatePost} disabled={loading}>
            {loading ? "Mise en forme…" : "Voir mon post"}
          </button>
        </div>
      )}

      {phase === "summary" && post && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Aperçu — touche un texte pour le modifier</p>
          <EditablePost post={post} setPost={setPost} photos={photos} notes={{ h: noteHumeur, e: noteEnergie, s: noteSociale, a: noteAventure }} dayNum={dNum} />
          {error && <p className="error">{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => saveEntry("draft")} disabled={loading}>Brouillon</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => saveEntry("published")} disabled={loading}>Publier</button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={startInterview}>Refaire l'interview</button>
            {entries.some((e) => e.date === date) && (
              <button className="btn-danger" onClick={deleteEntry}>Supprimer</button>
            )}
          </div>
        </div>
      )}

      {phase === "saved" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <p className="serif" style={{ fontSize: 19 }}>Journée enregistrée</p>
          <button className="btn" onClick={() => setPhase("date")}>Retour au calendrier</button>
        </div>
      )}
    </main>
  );
}

function EditablePost({ post, setPost, photos, notes, dayNum }) {
  const recit = Array.isArray(post.recit) ? post.recit : [];
  const upd = (field, value) => setPost((p) => ({ ...p, [field]: value }));
  const updRecit = (i, k, v) => upd("recit", recit.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  const ta = (field, value, extra = {}) => (
    <textarea
      className="input"
      style={{ fontSize: 14, lineHeight: 1.5, resize: "vertical", ...extra }}
      rows={Math.max(2, Math.ceil((value || "").length / 45))}
      value={value || ""}
      onChange={(e) => upd(field, e.target.value)}
    />
  );

  return (
    <div className="post-card">
      <div className="post-header">
        <div style={{ flex: 1 }}>
          <div className="post-day">Jour {dayNum >= 0 ? dayNum : "—"}</div>
          <input className="input serif" style={{ fontSize: 17, marginTop: 4 }} value={post.titre || ""} onChange={(e) => upd("titre", e.target.value)} />
        </div>
        <div className="post-moods">
          <div className="mood-item"><span className="mood-small">😊{notes.h}</span><span className="mood-caption">humeur</span></div>
          <div className="mood-item"><span className="mood-small">⚡{notes.e}</span><span className="mood-caption">énergie</span></div>
          <div className="mood-item"><span className="mood-small">🤝{notes.s}</span><span className="mood-caption">sociale</span></div>
          <div className="mood-item"><span className="mood-small">🌋{notes.a}</span><span className="mood-caption">aventure</span></div>
        </div>
      </div>

      {post.lieux?.length > 0 && (
        <div className="chips">{post.lieux.map((l, i) => <span key={i} className="chip">📍 {l}</span>)}</div>
      )}
      {post.coords?.lat && (
        <div className="map-banner">📍 {post.lieux?.[0]} · {post.coords.lat.toFixed(2)}, {post.coords.lng.toFixed(2)} <span style={{ marginLeft: "auto", fontSize: 10.5, fontStyle: "italic", color: "var(--muted)" }}>carte interactive à venir</span></div>
      )}

      {photos.length > 0 && (
        <div className="photos">{photos.map((url, i) => <img key={i} src={url} alt="" />)}</div>
      )}

      <div className="section">
        {recit.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            <input className="input" style={{ fontWeight: 700 }} value={item.activite || ""} onChange={(e) => updRecit(i, "activite", e.target.value)} placeholder="Activité" />
            <textarea className="input" style={{ fontSize: 13.5 }} rows={2} value={item.detail || ""} onChange={(e) => updRecit(i, "detail", e.target.value)} />
          </div>
        ))}
      </div>

      {post.rencontres && (<div className="section"><div className="section-head">Rencontres</div>{ta("rencontres", post.rencontres)}</div>)}
      {post.anecdote && (<div className="section box-anecdote"><div className="section-head">L'anecdote</div>{ta("anecdote", post.anecdote)}</div>)}
      {post.adresse && (<div className="section"><div className="section-head">Bonne adresse</div>{ta("adresse", post.adresse)}</div>)}
      {post.reflexion && (<div className="section box-reflexion"><div className="section-head">Ce que je garde</div>{ta("reflexion", post.reflexion)}</div>)}
    </div>
  );
}

function NoteScale({ label, value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>{value}/5</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10, cursor: "pointer",
              border: "1.5px solid " + (n <= value ? "var(--accent)" : "var(--line2)"),
              background: n <= value ? "var(--accent)" : "var(--card)",
              color: n <= value ? "#fff" : "var(--muted)",
              fontFamily: "Space Mono, monospace", fontSize: 15, fontWeight: 700,
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Scale({ label, options, value, onChange, low, high }) {
  return (
    <div>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 10 }}>{label}</p>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map((em, i) => (
          <button key={i} onClick={() => onChange(i)} className="btn-secondary" style={{ flex: 1, fontSize: 22, padding: "10px 0", ...(value === i ? { borderColor: "var(--gold)", background: "var(--line)" } : {}) }}>
            {em}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
        <span>{low}</span><span>{high}</span>
      </div>
    </div>
  );
}

function MiniCalendar({ date, onSelect, entryDates, entries }) {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date(date + "T00:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const dstr = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 14, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button className="btn-secondary" style={{ padding: "6px 14px" }} onClick={() => setMonthDate(new Date(year, month - 1, 1))}>‹</button>
        <div className="serif" style={{ fontSize: 15, textTransform: "capitalize" }}>
          {monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </div>
        <button className="btn-secondary" style={{ padding: "6px 14px" }} onClick={() => setMonthDate(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={"h" + i} style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", padding: "4px 0" }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={"e" + i} />;
          const ds = dstr(d);
          const entry = entries.find((e) => e.date === ds);
          const isToday = ds === today;
          return (
            <button
              key={ds}
              onClick={() => onSelect(ds)}
              style={{
                position: "relative",
                aspectRatio: "1",
                border: isToday ? "1px solid var(--line2)" : "none",
                borderRadius: 8,
                background: "transparent",
                color: "var(--text)",
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              {d}
              {entry && (
                <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, borderRadius: "50%", background: entry.status === "published" ? "var(--gold)" : "var(--muted)" }} />
              )}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>● doré = publié · ● gris = brouillon</p>
    </div>
  );
}
