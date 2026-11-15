// =====================================================================
// config.ts — EVERY number the game logic uses lives here.
// Values are PLACEHOLDERS (game values) unless marked REAL.
// To tune the game, change numbers here. No other file needs to change.
// =====================================================================

import type { Action, Meters, World } from "./types";

export const MISSION = {
  sols: 5,                // MVP mission length
  workMinutesPerSol: 480, // 8 hours of crew time per sol
  researchGoal: 10,       // research points for a full success
};

export const SOL_LENGTH_MINUTES: Record<World, number> = {
  mars: 1479, // REAL: a Mars sol is 24 h 39 min
  moon: 1440, // placeholder: Moon day/night (~14 Earth days each) is handled later
};

export const DAYLIGHT = {
  sunriseMinute: 360, // 6:00
  sunsetMinute: 1080, // 18:00
};

export const START_METERS: Meters = {
  oxygen: 80,
  food: 70,
  power: 80,
  shielding: 60,
};

// How meters change every hour on their own (+ = goes up).
export const RATES_PER_HOUR = {
  oxygenBreathed: -1.5, // the crew breathing
  oxygenMade: 1.5,      // oxygen generator, ONLY while power > 0
  foodEaten: -0.5,
  powerUsed: -2,        // life support always runs
  solarDaylight: 4,     // solar panels, daylight only, clear sky
  shieldingWear: -0.1,  // background cosmic radiation slowly adds up
};

export const DUST = {
  stormSolarMultiplier: 0.3, // in a dust storm, solar makes 30% of normal
};

// Radiation the crew absorbs. Dose is in millisieverts (mSv), the unit NASA uses.
export const RADIATION = {
  // REAL: average dose on the surface, per Earth day (24 h).
  // Mars: Curiosity rover's RAD instrument, 0.64 mSv/day.
  // Moon: China's Chang'e 4 lander, 1.369 mSv/day (Science Advances, 2020).
  mSvPerDay: { mars: 0.64, moon: 1.369 } as Record<World, number>,
  solarStormMultiplier: 12,     // game value: a storm sol is about 12x a normal sol
  // How much a FULL shielding meter (100) blocks. Game values, but the idea is real:
  // shielding stops solar storm particles much better than cosmic rays.
  cosmicBlockedAtFullShield: 0.3, // blocks 30% of everyday cosmic rays
  stormBlockedAtFullShield: 0.8,  // blocks 80% of solar storm particles
  stormShieldingWearMultiplier: 5, // game value: storms wear shielding 5x faster
};

export const CALL_HOUSTON = {
  callMinutes: 10,            // time spent talking / recording
  marsOneWayDelayMinutes: 22, // REAL range: 3–22 min one way (NASA); we use the far end
  moonOneWayDelayMinutes: 1,  // REAL: ~1.3 seconds, rounded up (clock shows minutes)
};

export const LIMITS = {
  min: 0,
  max: 100,
  evacuateAt: 0, // if oxygen, food or shielding reaches this, the crew is evacuated
};

// Station actions. Every one costs something (no free choices).
export const ACTIONS: Action[] = [
  { id: "tendGreenhouse", label: "Tend the greenhouse",            station: "greenhouse", minutes: 60,  effects: { food: 6, power: -3 } },
  { id: "serviceOxygen",  label: "Service the oxygen generator",   station: "oxygen",     minutes: 60,  effects: { oxygen: 5, power: -2 } },
  { id: "cleanPanels",    label: "Go outside: clean solar panels", station: "solar array",    minutes: 120, effects: { power: 8, shielding: -3 } },
  { id: "buildShield",    label: "Go outside: activate shield", station: "solar array", minutes: 180, effects: { shielding: 12, power: -20 } },
  { id: "feedRats",       label: "Feed the lab rats",              station: "lab",        minutes: 15,  effects: { food: -1 } },
  { id: "studyRats",      label: "Study the rats",                 station: "lab",        minutes: 120, effects: { research: 2, power: -2 } },
  { id: "protectRats",    label: "Move the rats to the shielded room", station: "lab",    minutes: 30,  effects: { power: -1 } },
  // Call Houston's time cost is calculated from CALL_HOUSTON in engine.ts
  { id: "callHouston",    label: "Call Houston",                   station: "comms",      minutes: 0,   effects: {} },
];