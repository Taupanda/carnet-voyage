"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PHASES } from "../../lib/itinerary";
import { stageDays, plageDates, afficheJour } from "../../lib/stages";
import { useCalendrier } from "../EtapesProvider";

const ItineraryMap = dynamic(() => import("./ItineraryMap"), { ssr: false });

// répartition thématique (le "split" du parcours)
const SPLIT = [
  { label: "Villes & culture coloniale", days: 26, color: "#E0177D" },
  { label: "Nature & montagne", days: 13, color: "#3FA565" },
  { label: "Plages & mer", days: 45, color: "#1EC2B0" },
  { label: "Volcans & lacs", days: 15, color: "#D87A4A" },
  { label: "Transit", days: 2, color: "#8B7B66" },
];

const TOTAL = SPLIT.reduce((s, x) => s + x.days, 0);

export default function Itineraire() {
  const [view, setView] = useState("apercu"); // apercu | calendrier
  const [openPhase, setOpenPhase] = useState(null);
  const { STAGES, TRIP_START, TRIP_DATES } = useCalendrier();
  // Les dates viennent des étapes, appariées rang par rang : la page ne les
  // recopie plus, elle ne peut donc plus les contredire.
  const phases = PHASES.map((p, i) => ({
    ...p,
    debut: STAGES[i].debut,
    fin: STAGES[i].fin,
    days: stageDays(STAGES[i]),
    dates: plageDates(STAGES[i].debut, STAGES[i].fin),
  }));

  return (
    <main className="container-wide" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <p className="eyebrow">Mexico · Belize · Guatemala · Salvador</p>
      <h1 className="display" style={{ fontSize: "clamp(24px, 4vw, 32px)", margin: "8px 0 12px" }}>
        Mon voyage
      </h1>
      <div className="voyage-bascule">
        <Link href="/itineraire" className={"voyage-onglet" + (true ? " on" : "")}>Itinéraire</Link>
        <Link href="/planning" className={"voyage-onglet" + (false ? " on" : "")}>Planning</Link>
      </div>

      <p style={{ color: "var(--text2)", marginBottom: 20 }}>
        101 jours, 11 étapes, du plateau central à l'Amérique centrale.
      </p>

      {/* bascule de vue */}
      <div className="filters" style={{ marginBottom: 22 }}>
        <button className={"filter" + (view === "apercu" ? " on" : "")}
          style={view === "apercu" ? { background: "var(--stage)", borderColor: "var(--stage)" } : {}}
          onClick={() => setView("apercu")}>
          Carte & étapes
        </button>
        <button className={"filter" + (view === "calendrier" ? " on" : "")}
          style={view === "calendrier" ? { background: "var(--stage)", borderColor: "var(--stage)" } : {}}
          onClick={() => setView("calendrier")}>
          Vue calendrier
        </button>
      </div>

      {view === "apercu" ? (
        <>
          <ItineraryMap phases={phases} />

          {/* répartition thématique */}
          <div style={{ margin: "24px 0 10px" }}>
            <p className="block-head" style={{ marginBottom: 10 }}>Le parcours en un coup d'œil</p>
            <div className="prog" style={{ height: 16 }}>
              {SPLIT.map((s, i) => (
                <i key={i} title={`${s.label} · ${s.days} j`} style={{ flex: s.days, background: s.color }} />
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 12 }}>
              {SPLIT.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color }} />
                  {s.label}
                  <span className="mono" style={{ color: "var(--muted)" }}>{s.days}j</span>
                </div>
              ))}
            </div>
          </div>

          {/* étapes détaillées */}
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            {phases.map((p) => {
              const open = openPhase === p.id;
              return (
                <div key={p.id} className="phase-card" style={{ "--c": p.color }}>
                  <button className="phase-head" onClick={() => setOpenPhase(open ? null : p.id)}>
                    <span className="phase-num" style={{ background: p.color }}>{p.num}</span>
                    <span className="phase-emoji">{p.emoji}</span>
                    <span className="phase-titles">
                      <span className="phase-title">{p.title}</span>
                      <span className="mono phase-meta">{p.dates} · {p.days} jours</span>
                    </span>
                    <span className="phase-chev">{open ? "−" : "+"}</span>
                  </button>

                  {open && (
                    <div className="phase-body">
                      {/* villes */}
                      <div className="chips" style={{ marginBottom: 16 }}>
                        {p.cities.map((c, i) => (
                          <span key={i} className="chip" style={{ borderColor: p.color, color: p.color }}>📍 {c.name}</span>
                        ))}
                      </div>

                      {/* à voir / à faire */}
                      {p.poi && (
                        <div className="poi-cols">
                          {Object.entries(p.poi).map(([cat, items]) => (
                            <div key={cat}>
                              <div className="block-head" style={{ color: p.color }}>{cat}</div>
                              <ul className="poi-ul">
                                {items.map((it, i) => <li key={i}>{it}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* immanquables */}
                      {p.highlights && (
                        <div className="phase-block">
                          <div className="block-head" style={{ color: p.color }}>À ne pas manquer</div>
                          <ul className="hl-ul">
                            {p.highlights.map((h, i) => (
                              <li key={i}><span className="hl-dot" style={{ background: p.color }} />{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* bonnes tables */}
                      {p.eat && p.eat.length > 0 && (
                        <div className="phase-block">
                          <div className="block-head" style={{ color: p.color }}>Bonnes tables & bars</div>
                          <div className="eat-grid">
                            {p.eat.map((e, i) => (
                              <div key={i} className="eat-item">
                                <span className="eat-badge">{e.type === "bar" ? "🍸" : "🍽️"}</span>
                                <div>
                                  <div className="eat-name">{e.name} <span className="mono eat-note">{e.note}</span></div>
                                  <div className="eat-desc">{e.desc}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* conseils */}
                      {p.tips && (
                        <div className="phase-block tips-block">
                          <div className="block-head" style={{ color: p.color }}>Bon à savoir</div>
                          <ul className="tips-ul">
                            {p.tips.map((t, i) => <li key={i}><span style={{ color: p.color }}>›</span> {t}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <CalendarView phases={phases} debut={TRIP_START} nombre={TRIP_DATES} />
      )}
    </main>
  );
}

// Une case par jour du voyage, colorée par l'étape qui le couvre.
function CalendarView({ phases, debut, nombre }) {
  const days = [];
  for (let i = 0; i < nombre; i++) {
    const date = new Date(Date.parse(debut + "T00:00:00Z") + i * 86400000);
    const iso = date.toISOString().slice(0, 10);
    days.push({ n: i, date, phase: phases.find((p) => iso >= p.debut && iso <= p.fin) });
  }

  // grouper par mois
  const byMonth = {};
  days.forEach((d) => {
    const key = d.date.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
    (byMonth[key] = byMonth[key] || []).push(d);
  });

  return (
    <div>
      {Object.entries(byMonth).map(([month, ds]) => (
        <div key={month} style={{ marginBottom: 26 }}>
          <h3 className="display" style={{ fontSize: 17, marginBottom: 10, textTransform: "capitalize" }}>{month}</h3>
          <div className="cal-itin">
            {ds.map((d) => (
              <div key={d.n} className="cal-itin-day" style={{ background: d.phase ? d.phase.color : "var(--ink3)", color: d.phase ? "#16111C" : "var(--muted)" }}
                title={d.phase ? `Jour ${afficheJour(d.n)} — ${d.phase.title}` : `Jour ${afficheJour(d.n)}`}>
                <span className="cal-itin-num">{d.date.getUTCDate()}</span>
                {d.phase && <span className="cal-itin-emoji">{d.phase.emoji}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 16 }}>
        {phases.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
            {p.emoji} {p.title}
          </div>
        ))}
      </div>
    </div>
  );
}
