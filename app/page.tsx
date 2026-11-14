"use client";

import { useState } from "react";
import { config, isDay, nextTurn, startState } from "./gameLogic";
import type { Action, Dest, GameState } from "./gameLogic";
import Astronaut from "./Astronaut";

const destinations = {
  moon: {
    name: "Moon",
    video: "/moon.mp4",
    blurb: "Nights last 14 Earth days. Your solar panels go dark. Can you keep the lights on?",
    stats: [
      ["GRAVITY", "0.17 g"],
      ["DAY LENGTH", "29.5 Earth days"],
      ["SUNLIGHT", "14 days on, 14 off"],
      ["BIG RISK", "Freezing nights"],
    ],
    gauges: [["POWER", 85], ["RADIATION", 70], ["SUPPLY TRIPS", 40]],
  },
  mars: {
    name: "Mars",
    video: "/mars.mp4",
    blurb: "Dust storms block the sun. Resupply is months away. Plan carefully.",
    stats: [
      ["GRAVITY", "0.38 g"],
      ["DAY LENGTH", "24 h 37 min"],
      ["SUNLIGHT", "~43% of Earth"],
      ["BIG RISK", "Dust storms"],
    ],
    gauges: [["POWER", 60], ["RADIATION", 75], ["SUPPLY TRIPS", 95]],
  },
} as const;

const actions: { id: Action; icon: string; label: string; desc: string }[] = [
  { id: "greenhouse", icon: "🌱", label: "Run greenhouse", desc: "+food, +oxygen, uses power" },
  { id: "conserve", icon: "🔋", label: "Conserve power", desc: "saves energy, food and air drop" },
  { id: "recycle", icon: "💨", label: "Recycle air", desc: "+oxygen, uses power" },
];

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="gauge">
      <div className="gauge-label">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="track">
        <div className={`fill ${value < 30 ? "low" : ""}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<"title" | "name" | "game">("title");
  const [dest, setDest] = useState<Dest>("moon");
  const [name, setName] = useState("");
  const [game, setGame] = useState<GameState>(startState());

  const d = destinations[dest];
  const cfg = config[dest];
  const keys = Object.keys(destinations) as Dest[];
  const cleanName = name.trim();

  const inGame = screen === "game";
  const day = isDay(dest, game.turn);
  const night = inGame && !day;
  const ended = game.status !== "playing";

  function begin() {
    if (!cleanName) return;
    setGame(startState());
    setScreen("game");
  }
  function play(a: Action) {
    setGame((g) => nextTurn(dest, g, a));
  }
  function retry() {
    setGame(startState());
  }
  function backToTitle() {
    setGame(startState());
    setScreen("title");
  }

  function hint(): string {
    const nextIsNight = !isDay(dest, game.turn + 1);
    if (!day && game.power < 30) return `${cleanName}, power is low and the panels are dark. Conserve energy!`;
    if (game.oxygen < 30) return `${cleanName}, oxygen is low. Recycle the air!`;
    if (game.food < 30) return `${cleanName}, food is running low. Run the greenhouse!`;
    if (day && nextIsNight) return `Night is coming, ${cleanName}. Make sure the batteries are charged.`;
    if (day && game.power < 60) return `The sun is up, ${cleanName}. A good time to recharge.`;
    if (!day) return `It's night. The solar panels are dark, so watch your batteries.`;
    return `All systems steady, ${cleanName}. What's your next move?`;
  }

  return (
    <main className={`cockpit ${dest} ${night ? "night" : ""}`}>
      <header className="roof">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nasa-logo.png"
          alt="NASA logo"
          className="nasa-logo"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <div className="skylight">
          <span>MISSION CONTROL</span>
          <span className="dot" />
          <span>STEM TRAINER</span>
        </div>
        <div className="lights">
          <i /><i /><i />
        </div>
      </header>

      <section className="windows">
        <div className="pane" />
        <div className="view">
          {keys.map((key) => (
            <video
              key={key}
              className={`bg-video ${dest === key ? "show" : ""}`}
              src={destinations[key].video}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          ))}
          <div className="view-overlay" />
          <div className="night-tint" />
          {inGame && <div className="celestial">{day ? "☀️" : "🌙"}</div>}
          {inGame && <div className="celestial">{day ? "☀️" : "🌙"}</div>}
          {inGame && <Astronaut name={cleanName} />}

          <div className="view-content">
            {screen === "title" && (
              <>
                <h1 className="title">Junior Astronaut Mission Trainer</h1>
                <p className="subtitle">
                  Run a lunar or Martian outpost. Balance power, oxygen, and food
                  through every day and night.
                </p>
                <p className="blurb">{d.blurb}</p>
              </>
            )}

            {screen === "name" && (
              <>
                <h1 className="title small">Welcome aboard!</h1>
                <p className="subtitle">What should Mission Control call you, astronaut?</p>
                <input
                  className="name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 16))}
                  onKeyDown={(e) => e.key === "Enter" && begin()}
                  placeholder="Your name"
                  autoFocus
                />
                <button className="launch" onClick={begin} disabled={!cleanName}>
                  BEGIN TRAINING
                </button>
              </>
            )}

            {screen === "game" && (
              <>
                <div className="hud">
                  <span className={`phase ${day ? "day" : "nite"}`}>
                    {day ? "☀️ DAY" : "🌙 NIGHT"}
                  </span>
                  <span className="phase">
                    TURN {Math.min(game.turn, cfg.totalTurns)} / {cfg.totalTurns}
                  </span>
                </div>
                <h2 className="commander">Commander {cleanName}</h2>

                {!ended ? (
                  <p className="hint">📡 Mission Control: {hint()}</p>
                ) : (
                  <div className="end-card">
                    <h2>
                      {game.status === "won"
                        ? `Mission complete, Commander ${cleanName}! 🎉`
                        : "Mission failed"}
                    </h2>
                    <p>
                      {game.status === "won"
                        ? `Your crew survived all ${cfg.totalTurns} turns on the ${cfg.name}.`
                        : game.lossReason}
                    </p>
                    <div className="end-buttons">
                      <button className="key mars-key" onClick={retry}>Try again</button>
                      <button className="key moon-key" onClick={backToTitle}>Change destination</button>
                    </div>
                  </div>
                )}
                <p className="note">{cfg.note}</p>
              </>
            )}
          </div>
        </div>
        <div className="pane" />
      </section>

      {!inGame ? (
        <section className="console">
          <div className="monitor">
            <p>&gt; DESTINATION: {d.name.toUpperCase()}</p>
            {d.stats.map(([label, value]) => (
              <p key={label}>
                {label}: <b>{value}</b>
              </p>
            ))}
            <p className="cursor">&gt; </p>
          </div>

          <div className="controls">
            <p className="label">CHOOSE DESTINATION</p>
            <div className="keys">
              {keys.map((key) => (
                <button
                  key={key}
                  onClick={() => setDest(key)}
                  className={`key ${key}-key ${dest === key ? "active" : ""}`}
                >
                  {destinations[key].name}
                </button>
              ))}
            </div>
            {screen === "title" && (
              <button className="launch" onClick={() => setScreen("name")}>
                LAUNCH MISSION
              </button>
            )}
          </div>

          <div className="monitor">
            <p>&gt; CHALLENGE METER</p>
            {d.gauges.map(([label, value]) => (
              <div key={label} className="gauge">
                <div className="gauge-label">
                  <span>{label}</span>
                  <span>{value}%</span>
                </div>
                <div className="track">
                  <div className="fill" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="console">
          <div className="monitor">
            <p>&gt; CREW: {cleanName.toUpperCase()}</p>
            <Meter label="BATTERY" value={game.power} />
            <Meter label="OXYGEN" value={game.oxygen} />
            <Meter label="FOOD" value={game.food} />
          </div>

          <div className="controls">
            <p className="label">{ended ? "MISSION OVER" : "CHOOSE YOUR ACTION"}</p>
            <div className="actions">
              {actions.map((a) => (
                <button key={a.id} className="act" disabled={ended} onClick={() => play(a.id)}>
                  <b>{a.icon} {a.label}</b>
                  <small>{a.desc}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="monitor">
            <p>
              &gt; SOLAR OUTPUT: <b>{day ? `+${cfg.solar} / turn` : "0 (NIGHT)"}</b>
            </p>
            <p>&gt; LAST REPORT:</p>
            <p className="log">{game.log || "Awaiting orders..."}</p>
            <div className="timeline" title="Day and night schedule">
              {Array.from({ length: cfg.totalTurns }, (_, i) => {
                const t = i + 1;
                return (
                  <span
                    key={t}
                    className={`tick ${isDay(dest, t) ? "d" : "n"} ${t === game.turn && !ended ? "now" : ""} ${t < game.turn ? "past" : ""}`}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="credit">Video: NASA</footer>
    </main>
  );
}