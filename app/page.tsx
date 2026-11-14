"use client";

import { useState } from "react";

const destinations = {
  moon: {
    name: "The Moon",
    blurb: "14-day nights. Your solar panels go dark. Can you keep the lights on?",
    planetClass: "planet moon",
  },
  mars: {
    name: "Mars",
    blurb: "Dust storms and thin air. Resupply is months away. Plan carefully.",
    planetClass: "planet mars",
  },
} as const;

type Dest = keyof typeof destinations;

export default function Home() {
  const [dest, setDest] = useState<Dest>("moon");
  const d = destinations[dest];

  return (
    <main className="space-bg">
      <div className="stars" />
      <div className="stars twinkle" />
      <div className="shooting-star" />

      <header className="top-bar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nasa-logo.png"
          alt="NASA logo"
          className="nasa-logo"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <span className="badge">STEM Mission Trainer</span>
      </header>

      <section className="hero">
        <div className="planet-wrap">
          <div className="orbit">
            <span className="rocket">🚀</span>
          </div>
          <div className={d.planetClass} />
        </div>

        <h1 className="title">Junior Astronaut Mission Trainer</h1>
        <p className="subtitle">
          Run a lunar or Martian outpost. Balance power, oxygen, food, and
          radiation for 30 sols.
        </p>

        <div className="choices">
          {(Object.keys(destinations) as Dest[]).map((key) => (
            <button
              key={key}
              onClick={() => setDest(key)}
              className={`choice ${dest === key ? "active" : ""}`}
            >
              {destinations[key].name}
            </button>
          ))}
        </div>

        <p className="blurb">{d.blurb}</p>

        <button className="launch">Launch Mission</button>
      </section>
    </main>
  );
}