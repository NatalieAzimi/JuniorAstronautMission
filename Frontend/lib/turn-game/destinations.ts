import type { Dest } from "./gameLogic";

// Destination info shown on the homepage (moved here from page.tsx so both
// page.tsx and HomeHud.tsx can share it).
export const destinations = {
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
    // One-way radio delay (Earth–Moon ≈ 384,400 km at light speed)
    delay: "≈1.3 sec",
    distance: "384,400 km",
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
    // One-way radio delay varies with where Earth and Mars are in their orbits
    delay: "3–22 min",
    distance: "55–400 million km",
  },
} as const satisfies Record<Dest, unknown>;

export type DestInfo = (typeof destinations)[Dest];
