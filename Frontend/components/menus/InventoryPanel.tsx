"use client";

/**
 * InventoryPanel.tsx  (NEW)
 * FILE LOCATION: Frontend/components/menus/InventoryPanel.tsx
 * STYLES:        Frontend/components/menus/menus.css
 *
 * Opens with E (design from the TODO doc, in a space theme):
 *   LEFT   = your astronaut, name plate, suit gear and tools
 *   RIGHT  = OBJECTIVES · FACT BOOK · DATA SOURCES (instead of an item grid)
 *   BOTTOM = hotbar of spare parts for repairs
 * A new Fact Book card unlocks every 2–3 finished jobs.
 */

import { useEffect, useRef, useState } from "react";
import { FAULTS, PARTS, RADIATION } from "@/lib/mission/config";
import type { Dest, PartId, SystemId } from "@/lib/mission/config";
import { SOURCE_LABEL, factsFor } from "@/lib/mission/facts";
import type { Apod, SpaceWeather } from "@/lib/mission/nasaData";
import { prettyDate } from "@/lib/mission/nasaData";
import type { Objective } from "@/lib/mission/sim";
import { drawPortrait } from "@/components/game/outpostEngine";
import { play } from "@/lib/sfx";
import "./menus.css";

export type InventoryData = {
  name: string;
  dest: Dest;
  parts: Record<PartId, number>;
  broken: SystemId[];
  patched: SystemId[];
  facts: string[];
  toNextFact: number;
  objectives: Objective[];
  doseMsv: number;
  sick: boolean;
  weather: SpaceWeather | null;
  apod: Apod | null;
};

type Tab = "objectives" | "facts" | "sources";

const GEAR = [
  { icon: "🪖", name: "Helmet + lamp" },
  { icon: "🧑‍🚀", name: "Spacesuit" },
  { icon: "🧤", name: "Gloves" },
  { icon: "🥾", name: "Moon boots" },
  { icon: "🫧", name: "Oxygen pack" },
  { icon: "☢️", name: "Dosimeter" },
];
const TOOLS = [
  { icon: "🔧", name: "Wrench" },
  { icon: "🪛", name: "Screwdriver" },
  { icon: "📟", name: "Multimeter" },
  { icon: "🧹", name: "Panel brush" },
  { icon: "🔦", name: "Flashlight" },
  { icon: "📻", name: "Radio" },
];

export default function InventoryPanel({ data, onClose }: { data: InventoryData; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("objectives");
  const [open, setOpen] = useState<string | null>(null);
  const portrait = useRef<HTMLCanvasElement>(null);
  const all = factsFor(data.dest);

  useEffect(() => {
    if (portrait.current) drawPortrait(portrait.current, data.dest);
  }, [data.dest]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "e" || k === "escape" || k === "tab" || k === "i") {
        e.preventDefault();
        onClose();
      }
      if (k === "1") setTab("objectives");
      if (k === "2") setTab("facts");
      if (k === "3") setTab("sources");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pick = (t: Tab) => {
    setTab(t);
    play("click");
  };

  const w = data.weather;
  const donkiStatus = !w ? "Loading…" : w.live ? "LIVE" : "ARCHIVED";

  return (
    <div className="inv-backdrop" role="dialog" aria-label="Inventory" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="inv-panel">
        <span className="inv-rivet tl" /><span className="inv-rivet tr" /><span className="inv-rivet bl" /><span className="inv-rivet br" />

        {/* ---------- LEFT: astronaut ---------- */}
        <section className="inv-left">
          <div className="inv-gear">
            {GEAR.slice(0, 3).map((g) => (
              <span key={g.name} className="inv-slot" title={g.name}>{g.icon}</span>
            ))}
          </div>
          <div className="inv-avatar">
            <span className="inv-gearcol">
              {GEAR.slice(3, 5).map((g) => (
                <span key={g.name} className="inv-slot" title={g.name}>{g.icon}</span>
              ))}
            </span>
            <canvas ref={portrait} width={140} height={180} className="inv-portrait" aria-label="Your astronaut" />
            <span className="inv-gearcol">
              <span className={`inv-slot ${data.sick ? "warn" : ""}`} title={`Dosimeter: ${data.doseMsv.toFixed(1)} mSv this mission`}>
                {GEAR[5].icon}
              </span>
              <span className="inv-slot dose" title="Radiation dose this mission">
                {data.doseMsv.toFixed(1)}
                <small>mSv</small>
              </span>
            </span>
          </div>
          <div className="inv-name">{data.name.toUpperCase() || "ASTRONAUT"}</div>
          <p className="inv-sub">
            {data.sick ? "🤒 Resting (big radiation dose)" : "💪 Fit for duty"} · dose {data.doseMsv.toFixed(1)} / {RADIATION.careerLimit} mSv career limit
          </p>
          <p className="inv-head">TOOLS</p>
          <div className="inv-tools">
            {TOOLS.map((t) => (
              <span key={t.name} className="inv-slot" title={t.name}>{t.icon}</span>
            ))}
          </div>
        </section>

        {/* ---------- RIGHT: objectives / fact book / sources ---------- */}
        <section className="inv-right">
          <div className="inv-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "objectives"} className={tab === "objectives" ? "on" : ""} onClick={() => pick("objectives")}>
              🎯 OBJECTIVES
            </button>
            <button role="tab" aria-selected={tab === "facts"} className={tab === "facts" ? "on" : ""} onClick={() => pick("facts")}>
              📘 FACT BOOK <b>{data.facts.length}/{all.length}</b>
            </button>
            <button role="tab" aria-selected={tab === "sources"} className={tab === "sources" ? "on" : ""} onClick={() => pick("sources")}>
              🛰 DATA SOURCES
            </button>
          </div>

          <div className="inv-page">
            {tab === "objectives" && (
              <>
                <ul className="inv-obj">
                  {data.objectives.map((o) => (
                    <li key={o.text} className={o.done ? "done" : ""}>
                      <span className="box">{o.done ? "✔" : ""}</span>
                      {o.text}
                    </li>
                  ))}
                </ul>
                {data.broken.length > 0 && (
                  <div className="inv-alert">
                    <b>⚠ BROKEN SYSTEMS</b>
                    {data.broken.map((b) => (
                      <p key={b}>
                        {FAULTS[b].name}: {FAULTS[b].effect} <em>Needs: {PARTS[FAULTS[b].part].icon} {PARTS[FAULTS[b].part].name}</em>
                      </p>
                    ))}
                  </div>
                )}
                {data.patched.length > 0 && (
                  <p className="inv-note">🩹 Patched (will break again soon): {data.patched.map((b) => FAULTS[b].name).join(", ")}</p>
                )}
                <p className="inv-note">📘 Next fact unlocks in {data.toNextFact} job{data.toNextFact === 1 ? "" : "s"}.</p>
              </>
            )}

            {tab === "facts" && (
              <>
                <div className="inv-apod">
                  {data.apod?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.apod.image} alt={data.apod.title} loading="lazy" />
                  ) : (
                    <div className="inv-apod-empty">🌌</div>
                  )}
                  <div>
                    <span className={`badge ${data.apod?.live ? "live" : "arch"}`}>{data.apod?.live ? "LIVE NASA APOD" : "APOD OFFLINE"}</span>
                    <p className="inv-apod-title">{data.apod?.title ?? "Loading the sky photo…"}</p>
                    {data.apod?.date && (
                      <p className="inv-apod-credit">
                        {prettyDate(data.apod.date)} · © {data.apod.credit} ·{" "}
                        <a href={data.apod.link} target="_blank" rel="noreferrer">apod.nasa.gov</a>
                      </p>
                    )}
                  </div>
                </div>
                <ul className="inv-facts">
                  {[...all].sort((a, b) => Number(data.facts.includes(b.id)) - Number(data.facts.includes(a.id))).map((f) => {
                    const got = data.facts.includes(f.id);
                    const isOpen = open === f.id;
                    return (
                      <li key={f.id} className={got ? "got" : "locked"}>
                        <button disabled={!got} onClick={() => setOpen(isOpen ? null : f.id)}>
                          <span className="src">{got ? SOURCE_LABEL[f.source] : "LOCKED"}</span>
                          <b>{got ? f.title : "??? Finish more jobs to unlock"}</b>
                        </button>
                        {got && isOpen && (
                          <div className="inv-fact-body">
                            <p>{f.text}</p>
                            <p className="cred">
                              Source: {f.credit}
                              {f.url && (
                                <>
                                  {" "}·{" "}
                                  <a href={f.url} target="_blank" rel="noreferrer">link</a>
                                </>
                              )}
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {tab === "sources" && (
              <div className="inv-sources">
                <p className="inv-note">
                  <span className="badge live">LIVE</span> = fetched from NASA while you play.{" "}
                  <span className="badge arch">ARCHIVED</span> = a real NASA measurement saved inside the game.
                </p>
                <dl>
                  <dt><span className={`badge ${w?.live ? "live" : "arch"}`}>{donkiStatus}</span> NASA DONKI: space weather</dt>
                  <dd>
                    Solar flares for the Day 2 and Day 5 storms. Stronger real flares make harder storms.
                    {w && (
                      <>
                        {" "}Last 30 days{w.live ? "" : " (archived Sept 2017 record)"}: <b>{w.counts.X}</b> X-class, <b>{w.counts.M}</b> M-class flares.
                        Your storms: <b>{w.storms[0].classType}</b> ({prettyDate(w.storms[0].peak)}) and{" "}
                        <b>{w.storms[1].classType}</b> ({prettyDate(w.storms[1].peak)}).
                      </>
                    )}
                  </dd>
                  <dt><span className={`badge ${data.apod?.live ? "live" : "arch"}`}>{data.apod?.live ? "LIVE" : "OFFLINE"}</span> NASA APOD</dt>
                  <dd>A random real Astronomy Picture of the Day on the Fact Book cover, so every play has a different sky.</dd>
                  <dt><span className="badge arch">ARCHIVED</span> ISS radiation dosimetry (RadLab-type data)</dt>
                  <dd>ISS crews get about {RADIATION.issPerDay.low}–{RADIATION.issPerDay.high} mSv/day. That&apos;s the &ldquo;normal&rdquo; line on the storm radiation meter. Limits: {RADIATION.stormEventLimit} mSv per solar storm, {RADIATION.careerLimit} mSv career (NASA-STD-3001).</dd>
                  <dt><span className="badge arch">ARCHIVED</span> Surface radiation</dt>
                  <dd>Moon 1.37 mSv/day (Chang&apos;e 4), Mars 0.64 mSv/sol (Curiosity RAD). Your dosimeter adds this up every second.</dd>
                  <dt><span className="badge arch">ARCHIVED</span> LRO Diviner &amp; Curiosity REMS: temperature</dt>
                  <dd>Moon about +120 °C by day and −130 °C at night, −249 °C in shadowed craters. Mars (Gale Crater) about 0 °C to −70 °C. Goal zone 18–27 °C = the ISS cabin range.</dd>
                  <dt><span className="badge arch">ARCHIVED</span> NASA OSDR / Human Research Program</dt>
                  <dd>Bone loss (1–1.5% per month), sleep and plant-growth findings in the Fact Book.</dd>
                  <dt><span className="badge arch">ARCHIVED</span> CSA Food Production toolkit</dt>
                  <dd>How food grows on the Moon and how space farms help remote places on Earth.</dd>
                </dl>
                <p className="inv-note">
                  The game is a simplified model: meters are 0–100 and storm doses are scaled for play, but the numbers above are real.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ---------- BOTTOM: spare-parts hotbar ---------- */}
        <section className="inv-hotbar" aria-label="Spare parts">
          {(Object.keys(PARTS) as PartId[]).map((p) => (
            <span key={p} className={`inv-slot part ${data.parts[p] === 0 ? "empty" : ""}`} title={`${PARTS[p].name} ×${data.parts[p]}`}>
              {PARTS[p].icon}
              <b>{data.parts[p]}</b>
              <small>{PARTS[p].name}</small>
            </span>
          ))}
        </section>
        <p className="inv-help">E / ESC CLOSE · 1 2 3 SWITCH TABS · CLICK A FACT TO READ IT</p>
      </div>
    </div>
  );
}
