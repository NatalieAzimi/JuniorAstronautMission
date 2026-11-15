"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { config, isDay, nextTurn } from "./gameLogic";
import type { Action, Dest, GameState } from "./gameLogic";
import { createOutpost } from "./outpostEngine";
import type { FloatText, Outpost, StationId } from "./outpostEngine";
import "./game.css";

// Each hotbar slot is one of the real game actions.
// The station ids in the world match the Action names in gameLogic.ts.
const SLOTS: { id: Action; key: string; icon: string; label: string; up: string[]; down: string[] }[] = [
  { id: "greenhouse", key: "1", icon: "🌱", label: "GREENHOUSE", up: ["FOOD", "O₂"], down: ["PWR"] },
  { id: "recycle", key: "2", icon: "💨", label: "RECYCLE AIR", up: ["O₂"], down: ["PWR"] },
  { id: "conserve", key: "3", icon: "🔋", label: "CONSERVE", up: ["PWR"], down: [] },
];

type Props = {
  dest: Dest;
  name: string;
  game: GameState;
  setGame: (g: GameState) => void;
  paused?: boolean; // true while the Houston call is on screen
  onRetry: () => void;
  onBack: () => void;
};

function hint(dest: Dest, game: GameState, name: string): string {
  const day = isDay(dest, game.turn);
  const nextIsNight = !isDay(dest, game.turn + 1);
  if (!day && game.power < 30) return `${name}, power is low and the panels are dark. Conserve energy at the battery bank!`;
  if (game.oxygen < 30) return `${name}, oxygen is low. Walk to the air recycler!`;
  if (game.food < 30) return `${name}, food is running low. Tend the greenhouse!`;
  if (day && nextIsNight) return `Night is coming, ${name}. Make sure the batteries are charged.`;
  if (day && game.power < 60) return `The sun is up, ${name}. A good time to recharge.`;
  if (!day) return "It's night. The solar panels are dark, so watch your batteries.";
  return `All systems steady, ${name}. Walk to a station to make your next move.`;
}

// Turn the change between two states into "+10 FOOD" style floating text
function diff(a: GameState, b: GameState): FloatText[] {
  const out: FloatText[] = [];
  const add = (v: number, label: string, color: string) => {
    if (v !== 0) out.push({ text: `${v > 0 ? "+" : ""}${v} ${label}`, color: v > 0 ? color : "#ff9d95" });
  };
  add(b.power - a.power, "PWR", "#ffb347");
  add(b.oxygen - a.oxygen, "O₂", "#3be8ff");
  add(b.food - a.food, "FOOD", "#7dffb0");
  return out;
}

export default function GameScreen({ dest, name, game, setGame, paused = false, onRetry, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Outpost | null>(null);
  const [near, setNear] = useState<StationId | null>(null);

  const cfg = config[dest];
  const day = isDay(dest, game.turn);
  const ended = game.status !== "playing";
  const shownTurn = Math.min(game.turn, cfg.totalTurns);
  const sol = dest === "mars" ? Math.ceil(shownTurn / 2) : null;

  // Keep the latest values in refs so the engine's callbacks never go stale
  const live = useRef({ dest, game, ended, setGame });
  useLayoutEffect(() => {
    live.current = { dest, game, ended, setGame };
  });

  function act(a: Action) {
    const { dest: d, game: g, ended: over, setGame: set } = live.current;
    if (over) return;
    const next = nextTurn(d, g, a);
    engine.current?.feedback(a, diff(g, next));
    set(next);
  }

  // Create the world once
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const e = createOutpost(c, {
      dest,
      name,
      onNear: setNear,
      onUse: (id) => act(id),
    });
    engine.current = e;
    return () => e.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => engine.current?.setDest(dest), [dest]);
  useEffect(() => engine.current?.setName(name), [name]);
  useEffect(() => engine.current?.setNight(!day), [day]);
  useEffect(() => engine.current?.setPaused(paused || ended), [paused, ended]);
  useEffect(
    () => engine.current?.setStatus({ power: game.power, oxygen: game.oxygen, food: game.food }),
    [game.power, game.oxygen, game.food],
  );

  // Number keys 1-3: walk to that station and use it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const slot = SLOTS.find((s) => s.key === e.key);
      if (slot && !live.current.ended) engine.current?.goUse(slot.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused]);

  const meters = [
    { cls: "power", label: "BATTERY", v: game.power },
    { cls: "oxygen", label: "OXYGEN", v: game.oxygen },
    { cls: "food", label: "FOOD", v: game.food },
  ];

  return (
    <main className={`og ${dest} ${day ? "" : "night"}`}>
      <canvas ref={canvasRef} className="og-canvas" aria-label="Outpost map. Walk to a station to use it." />
      <div className="og-scan" aria-hidden="true" />
      <span className="og-corner tl" /><span className="og-corner tr" />
      <span className="og-corner bl" /><span className="og-corner br" />

      {/* Top-left: who you are + Mission Control */}
      <div className="og-tl">
        <section className="og-cmd og-frame">
          <p className="og-kicker">COMMANDER</p>
          <h2 className="og-name">{name.toUpperCase()}</h2>
          <div className="og-chips">
            <span className="og-chip target">TARGET: {cfg.name.toUpperCase()}</span>
            <span className={`og-chip ${day ? "day" : "nite"}`}>{day ? "☀ DAY" : "☾ NIGHT"}</span>
          </div>
        </section>
        {!ended && (
          <p className="og-hint og-frame">
            <b>📡 HOUSTON:</b> {hint(dest, game, name)}
          </p>
        )}
      </div>

      {/* Top-right: clock, like the inspo's date panel */}
      <div className="og-tr">
        <section className="og-clock og-frame">
          <span className="og-sol">
            {sol ? `SOL ${sol} · ` : ""}
            {day ? "DAYTIME" : "NIGHTTIME"}
          </span>
          <b className="og-turn">
            TURN {String(shownTurn).padStart(2, "0")} / {cfg.totalTurns}
          </b>
        </section>
        <section className={`og-solar og-frame ${day ? "" : "off"}`}>
          <i className="og-sun" /> SOLAR {day ? `+${cfg.solar} / TURN` : "OFFLINE"}
        </section>
        <button className="og-btn" onClick={onBack}>‹ CHANGE DESTINATION</button>
      </div>

      {/* Bottom-left: last report */}
      <section className="og-log og-frame">
        <p className="og-kicker">LAST REPORT</p>
        <p className="og-report">{game.log || "Awaiting orders… walk to a station and press E."}</p>
        <p className="og-tip">WASD / ARROWS · CLICK TO WALK · E TO USE · 1–3 QUICK</p>
        <p className="og-credit">{cfg.note}</p>
      </section>

      {/* Bottom-centre: day/night timeline + hotbar */}
      <div className="og-bottom">
        <div className="og-timeline" title="Day and night schedule">
          {Array.from({ length: cfg.totalTurns }, (_, i) => {
            const t = i + 1;
            return (
              <span
                key={t}
                className={`og-tick ${isDay(dest, t) ? "d" : "n"} ${t === game.turn && !ended ? "now" : ""} ${t < game.turn ? "past" : ""}`}
              />
            );
          })}
        </div>
        <div className="og-hotbar og-frame">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              className={`og-slot ${near === s.id ? "near" : ""}`}
              disabled={ended || paused}
              onClick={() => engine.current?.goUse(s.id)}
              title={near === s.id ? "Use now" : "Walk there and use it"}
            >
              <span className="og-key">{s.key}</span>
              <span className="og-ico">{s.icon}</span>
              <span className="og-lbl">{s.label}</span>
              <span className="og-cost">
                {s.up.map((u) => <span key={u} className="up">▲{u}</span>)}
                {s.down.map((u) => <span key={u} className="dn">▼{u}</span>)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom-right: battery-style meters */}
      <section className="og-meters og-frame" aria-label="Supplies">
        {meters.map((m) => (
          <div key={m.cls} className={`og-meter ${m.cls} ${m.v < 30 ? "low" : ""}`}>
            <div className="og-cell" role="meter" aria-valuenow={m.v} aria-valuemin={0} aria-valuemax={100} aria-label={m.label}>
              <i className="og-fill" style={{ height: `calc(${m.v}% - 4px)` }} />
            </div>
            <b className="og-mval">{m.v}</b>
            <span className="og-mlabel">{m.label}</span>
          </div>
        ))}
      </section>

      {ended && (
        <div className="og-end">
          <div className={`og-endcard og-frame ${game.status}`}>
            <p className="og-kicker">{game.status === "won" ? "MISSION COMPLETE" : "MISSION FAILED"}</p>
            <h2>{game.status === "won" ? `Great work, Commander ${name}! 🎉` : "The outpost went dark"}</h2>
            <p>
              {game.status === "won"
                ? `You survived all ${cfg.totalTurns} turns on the ${cfg.name}.`
                : game.lossReason}
            </p>
            <div className="og-endbtns">
              <button className="og-launch" onClick={onRetry}>▶ TRY AGAIN</button>
              <button className="og-launch ghost" onClick={onBack}>CHANGE DESTINATION</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
