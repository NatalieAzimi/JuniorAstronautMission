"use client";

import { useState } from "react";

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

type Dest = keyof typeof destinations;

export default function Home() {
  const [dest, setDest] = useState<Dest>("moon");
  const d = destinations[dest];
  const keys = Object.keys(destinations) as Dest[];

  return (
    <main className={`cockpit ${dest}`}>
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
          <div className="view-content">
            <h1 className="title">Junior Astronaut Mission Trainer</h1>
            <p className="subtitle">
              Run a lunar or Martian outpost. Balance power, oxygen, food, and
              radiation for 30 sols.
            </p>
            <p className="blurb">{d.blurb}</p>
          </div>
        </div>
        <div className="pane" />
      </section>

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
          <button className="launch">LAUNCH MISSION</button>
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

      <footer className="credit">Video: NASA</footer>
    </main>
  );
}