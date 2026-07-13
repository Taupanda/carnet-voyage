"use client";
import { useState, useRef, useEffect } from "react";
import PushButton from "../PushButton";

const KIFF = ["😑", "🙂", "😊", "🤩", "🥳"];
const AVENTURE = ["🛋️", "🚶", "🧗", "🏄", "🌋"];
const EMOJIS = ["😄", "🥰", "😌", "🤩", "😴", "😭", "🤯", "😤", "🥵", "🤒", "🌞", "🌧️", "💃", "🧘", "🍹", "🏖️"];
const TRIP_START = new Date("2026-09-08T00:00:00");

const emptyExtracted = () => ({ lieu: null, activites: null, rencontres: null, anecdote: null, adresse: null, reflexion: null, photos: null });
const todayStr = () => new Date().toISOString().slice(0, 10);
const dayNumber = (d) => Math.round((new Date(d + "T00:00:00") - TRIP_START) / 86400000) + 1;

function api(path, opts = {}, key) {
  return fetch(path, {
    ...opts,
    headers: { ...(opts.headers || {}), "x-admin-key": key, ...(opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
  });
}

export default function Journal() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [phase, setPhase] = useState("date");
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [extracted, setExtracted] = useState(emptyExtracted());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState([]); // array of URLs
  const [humeur, setHumeur] = useState("");
  const [kiff, setKiff] = useState(2);
  const [aventure, setAventure] = useState(2);
  const [reflexionPrivee, setReflexionPrivee] = useState(false);
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("carnet-key");
    if (saved) {
      setAdminKey(saved);
      tryAuth(saved);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, phase]);

  async function tryAuth(key) {
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: key }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.reason || "Connexion refusée.");
        sessionStorage.removeItem("carnet-key");
        return;
      }
      if (data.missingVars?.length) {
        setError("Variables manquantes sur Vercel : " + data.missingVars.join(", "));
        return;
      }
      setAuthed(true);
      sessionStorage.setItem("carnet-key", key);
      const listRes = await api("/api/entries", {}, key);
      if (listRes.ok) setEntries(await listRes.json());
    } catch (e) {
      setError("Impossible de joindre le serveur : " + e.message);
    }
  }

  function startInterview() {
    setMessages([{ role: "assistant", content: "Alors, cette journée ? Raconte-moi comme tu veux, dans l'ordre que tu veux — je remets tout en forme après." }]);
    setExtracted(emptyExtracted());
    setPhotos([]);
    setHumeur("");
    setKiff(2);
    setAventure(2);
    setReflexionPrivee(false);
    setPost(null);
    setError(null);
    setPhase("chat");
  }

  function openDate(d) {
    setDate(d);
    setError(null);
    const existing = entries.find((e) => e.date === d);
    if (existing) {
      setExtracted(existing.raw_extracted || emptyExtracted());
      setHumeur(existing.humeur || "");
      setKiff(existing.kiff ?? 2);
      setAventure(existing.aventure ?? 2);
      setReflexionPrivee(!!existing.reflexion_privee);
      setPhotos(existing.photos || []);
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
      const res = await api("/api/interview", { method: "POST", body: JSON.stringify({ history: newMessages, extracted, photoCount: photos.length }) }, adminKey);
      if (!res.ok) throw new Error("api");
      const parsed = await res.json();
      setExtracted((prev) => ({ ...prev, ...parsed.extracted }));
      setMessages((m) => [...m, { role: "assistant", content: parsed.reply }]);
      if (parsed.done) setTimeout(() => setPhase("moods"), 600);
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
        const res = await api("/api/upload", { method: "POST", body: fd }, adminKey);
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
      const res = await api("/api/format", { method: "POST", body: JSON.stringify({ extracted, date }) }, adminKey);
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
      humeur,
      kiff,
      aventure,
      photos,
      raw_extracted: extracted,
      status,
    };
    try {
      const res = await api("/api/entries", { method: "POST", body: JSON.stringify(entry) }, adminKey);
      if (!res.ok) throw new Error((await res.json()).error);
      const saved = await res.json();
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
      await api("/api/entries", { method: "DELETE", body: JSON.stringify({ date }) }, adminKey);
      setEntries((es) => es.filter((x) => x.date !== date));
      setPhase("date");
    } catch (e) {
      setError("Échec de la suppression.");
    }
  }

  const dNum = dayNumber(date);

  if (!authed) {
    return (
      <main className="container" style={{ paddingTop: 80, maxWidth: 380 }}>
        <h1 className="serif" style={{ fontSize: 24, marginBottom: 16 }}>Carnet — accès privé</h1>
        <input
          className="input"
          type="password"
          placeholder="Mot de passe"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tryAuth(adminKey)}
        />
        {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}
        <button className="btn" style={{ marginTop: 14, width: "100%" }} onClick={() => tryAuth(adminKey)}>Entrer</button>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 560, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "var(--bg2)" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px dashed var(--gold)", color: "var(--gold)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span className="serif" style={{ fontSize: 16, fontWeight: 700 }}>{dNum > 0 ? dNum : "—"}</span>
          <span style={{ fontSize: 7, textTransform: "uppercase" }}>{dNum > 0 ? "jour" : "avant"}</span>
        </div>
        <div>
          <div className="serif" style={{ fontSize: 16 }}>Carnet de bord</div>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>
            {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        {phase !== "date" && (
          <button className="btn-secondary" style={{ marginLeft: "auto", padding: "8px 12px", fontSize: 13 }} onClick={() => setPhase("date")}>
            Calendrier
          </button>
        )}
      </header>

      {phase === "date" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="serif" style={{ fontSize: 19 }}>Quelle journée veux-tu raconter ?</h2>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Un point doré = une note existe déjà (tape pour la modifier).</p>
          <MiniCalendar date={date} onSelect={openDate} entryDates={entries.map((e) => e.date)} entries={entries} />
          {error && <p className="error">{error}</p>}
          <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
              Rappel chaque soir à 20h, et le lendemain matin si la journée est encore vide.
            </p>
            <PushButton role="admin" adminKey={adminKey} label="Activer mes rappels" labelDone="Rappels activés ✓" />
          </div>
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
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 22 }}>
          <h2 className="serif" style={{ fontSize: 19 }}>Dernières petites notes</h2>
          <div>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 10 }}>Ton humeur du jour — choisis ou tape l'emoji qui te ressemble</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 8 }}>
              {EMOJIS.map((em) => (
                <button key={em} onClick={() => setHumeur(em)} className="btn-secondary" style={{ padding: "8px 0", fontSize: 20, ...(humeur === em ? { borderColor: "var(--gold)", background: "var(--line)" } : {}) }}>
                  {em}
                </button>
              ))}
            </div>
            <input className="input" value={humeur} onChange={(e) => setHumeur(e.target.value.slice(-2))} placeholder="…ou n'importe quel emoji du clavier" />
          </div>
          <Scale label="Niveau de kiff" options={KIFF} value={kiff} onChange={setKiff} low="bof" high="journée de folie" />
          <Scale label="Sortie de zone de confort" options={AVENTURE} value={aventure} onChange={setAventure} low="tranquille" high="grand saut" />
          {extracted.reflexion && extracted.reflexion !== "rien" && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--muted)" }}>
              <input type="checkbox" checked={reflexionPrivee} onChange={(e) => setReflexionPrivee(e.target.checked)} style={{ width: 18, height: 18 }} />
              Garder ma réflexion privée (invisible sur le blog)
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn" style={{ marginTop: "auto" }} onClick={generatePost} disabled={loading || !humeur}>
            {loading ? "Mise en forme…" : humeur ? "Voir mon post" : "Choisis d'abord ton humeur"}
          </button>
        </div>
      )}

      {phase === "summary" && post && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Aperçu — touche un texte pour le modifier</p>
          <EditablePost post={post} setPost={setPost} photos={photos} humeur={humeur} kiff={kiff} aventure={aventure} dayNum={dNum} />
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

function EditablePost({ post, setPost, photos, humeur, kiff, aventure, dayNum }) {
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
          <div className="post-day">Jour {dayNum > 0 ? dayNum : "—"}</div>
          <input className="input serif" style={{ fontSize: 17, marginTop: 4 }} value={post.titre || ""} onChange={(e) => upd("titre", e.target.value)} />
        </div>
        <div className="post-moods">
          <div className="mood-item"><span className="mood-big">{humeur}</span><span className="mood-caption">humeur</span></div>
          <div className="mood-item"><span className="mood-small">{KIFF[kiff]}</span><span className="mood-caption">kiff</span></div>
          <div className="mood-item"><span className="mood-small">{AVENTURE[aventure]}</span><span className="mood-caption">aventure</span></div>
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
