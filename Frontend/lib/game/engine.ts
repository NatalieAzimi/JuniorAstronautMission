// =====================================================================
// engine.ts — the rules: clock, day/night, meters, actions, win/lose.
// Every function takes a state and returns a NEW state (never edits it).
// No React, Next.js or Phaser in this file.
// =====================================================================

import type { Action, Effects, GameState, LogEntry, Meters, World } from "./types";
import {
  ACTIONS,
  CALL_HOUSTON,
  DAYLIGHT,
  DUST,
  LIMITS,
  MISSION,
  RADIATION,
  RATES_PER_HOUR,
  SOL_LENGTH_MINUTES,
  START_METERS,
} from "./config";

// Flags the engine itself understands. Story events turn these on
// through a choice's `flag` field (e.g. flag: "dustStorm").
export const ENGINE_FLAGS = {
  dustStorm: "dustStorm",       // while set, solar panels make less power
  solarStorm: "solarStorm",     // while set, radiation is much higher
  ratsSheltered: "ratsSheltered", // set by the protectRats action
};

const METER_KEYS: (keyof Meters)[] = ["oxygen", "food", "power", "shielding"];
const WORKDAY_START = DAYLIGHT.sunriseMinute + 120; // crew starts work at 8:00

// ---------- small helpers ----------

function clamp(value: number): number {
  return Math.min(LIMITS.max, Math.max(LIMITS.min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function addLog(state: GameState, text: string, changes?: Effects): GameState {
  const entry: LogEntry = { sol: state.sol, minute: state.minuteOfSol, text, changes };
  return { ...state, log: [...state.log, entry] };
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ---------- read-only helpers for the screens ----------

// Life support is the weakest of oxygen and food.
export function lifeSupport(state: GameState): number {
  return Math.min(state.meters.oxygen, state.meters.food);
}

export function isDaylight(state: GameState): boolean {
  return state.minuteOfSol >= DAYLIGHT.sunriseMinute && state.minuteOfSol < DAYLIGHT.sunsetMinute;
}

// Radiation dose rate in mSv per day. Shielding blocks some of it,
// and blocks solar storm particles better than everyday cosmic rays.
function doseRatePerDay(world: World, shielding: number, solarStorm: boolean): number {
  const blockedAtFull = solarStorm ? RADIATION.stormBlockedAtFullShield : RADIATION.cosmicBlockedAtFullShield;
  const getsThrough = 1 - blockedAtFull * (shielding / 100);
  return RADIATION.mSvPerDay[world] * (solarStorm ? RADIATION.solarStormMultiplier : 1) * getsThrough;
}

// For a radiation readout on screen, e.g. "0.51 mSv per day".
export function radiationPerDay(state: GameState): number {
  return doseRatePerDay(state.world, state.meters.shielding, state.flags.includes(ENGINE_FLAGS.solarStorm));
}

export function ratsAreSheltered(state: GameState): boolean {
  return state.flags.includes(ENGINE_FLAGS.ratsSheltered);
}

// True during a solar storm if the rats are NOT in the shielded room.
export function ratsInDanger(state: GameState): boolean {
  return state.flags.includes(ENGINE_FLAGS.solarStorm) && !ratsAreSheltered(state);
}

// e.g. "Sol 2, 14:05"
export function clockText(state: GameState): string {
  const h = Math.floor(state.minuteOfSol / 60);
  const m = Math.floor(state.minuteOfSol % 60);
  return `Sol ${state.sol}, ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// The question goes out and the answer comes back: delay counts twice.
export function callHoustonMinutes(world: World): number {
  const oneWay =
    world === "mars" ? CALL_HOUSTON.marsOneWayDelayMinutes : CALL_HOUSTON.moonOneWayDelayMinutes;
  return CALL_HOUSTON.callMinutes + 2 * oneWay;
}

export function getAction(actionId: string): Action | undefined {
  return ACTIONS.find((a) => a.id === actionId);
}

// All actions available at one station, e.g. actionsAt("lab").
export function actionsAt(station: string): Action[] {
  return ACTIONS.filter((a) => a.station === station);
}

export function actionMinutes(actionId: string, world: World): number {
  if (actionId === "callHouston") return callHoustonMinutes(world);
  return getAction(actionId)?.minutes ?? 0;
}

// Screens use this to grey out buttons and show the reason.
export function canDoAction(state: GameState, actionId: string): { ok: boolean; reason?: string } {
  if (state.status !== "playing") return { ok: false, reason: "The mission is over." };
  if (!getAction(actionId)) return { ok: false, reason: `Unknown action: ${actionId}` };
  if (actionMinutes(actionId, state.world) > state.workMinutesLeft) {
    return { ok: false, reason: "Not enough crew time left today." };
  }
  if (actionId === "feedRats" && state.rats.fedToday) {
    return { ok: false, reason: "The rats were already fed today." };
  }
  if (actionId === "studyRats" && !state.rats.fedToday) {
    return { ok: false, reason: "Feed the rats first." };
  }
  if (actionId === "studyRats" && ratsInDanger(state)) {
    return { ok: false, reason: "Solar storm! Move the rats to the shielded room first." };
  }
  if (actionId === "protectRats" && ratsAreSheltered(state)) {
    return { ok: false, reason: "The rats are already in the shielded room." };
  }
  return { ok: true };
}

// ---------- starting a game ----------

export function newGame(world: World = "mars", seed: number = Date.now()): GameState {
  const state: GameState = {
    world,
    seed,
    sol: 1,
    minuteOfSol: WORKDAY_START,
    workMinutesLeft: MISSION.workMinutesPerSol,
    meters: { ...START_METERS },
    research: 0,
    radiationMsv: 0,
    rats: { fedToday: false },
    flags: [],
    activeEventId: null,
    log: [],
    status: "playing",
  };
  return addLog(state, `Mission start on ${world === "mars" ? "Mars" : "the Moon"}.`);
}

// ---------- win / lose ----------

function evacuationReason(m: Meters): string | null {
  if (m.oxygen <= LIMITS.evacuateAt) return "oxygen ran out";
  if (m.food <= LIMITS.evacuateAt) return "food ran out";
  if (m.shielding <= LIMITS.evacuateAt) return "radiation shielding failed";
  return null;
}

function checkStatus(state: GameState): GameState {
  if (state.status !== "playing") return state;
  const reason = evacuationReason(state.meters);
  if (!reason) return state;
  return addLog({ ...state, status: "evacuated" }, `Emergency evacuation: ${reason}.`);
}

// ---------- changing meters ----------

// Apply a choice's or action's effects and record why.
export function applyEffects(state: GameState, effects: Effects, reason: string): GameState {
  if (state.status !== "playing") return state;
  const meters: Meters = { ...state.meters };
  for (const key of METER_KEYS) {
    const change = effects[key];
    if (typeof change === "number") meters[key] = clamp(meters[key] + change);
  }
  const research = state.research + (effects.research ?? 0);
  return checkStatus(addLog({ ...state, meters, research }, reason, effects));
}

// ---------- time ----------

// Let time pass minute by minute: the crew breathes and eats, solar
// charges the battery in daylight, the oxygen generator only works
// while there is power, and the crew absorbs radiation.
// Stops early if the crew is evacuated.
export function advanceTime(state: GameState, minutes: number): GameState {
  if (state.status !== "playing" || minutes <= 0) return state;

  const solLength = SOL_LENGTH_MINUTES[state.world];
  const storm = state.flags.includes(ENGINE_FLAGS.dustStorm);
  const solarStorm = state.flags.includes(ENGINE_FLAGS.solarStorm);
  const ratsExposed = ratsInDanger(state);
  const before: Meters = { ...state.meters };
  const s: GameState = { ...state, meters: { ...state.meters }, rats: { ...state.rats } };
  let powerWentOut = false;
  let ratsSpoiled = false;

  for (let i = 0; i < minutes; i++) {
    const m = s.meters;
    const solar = isDaylight(s)
      ? RATES_PER_HOUR.solarDaylight * (storm ? DUST.stormSolarMultiplier : 1)
      : 0;
    m.power = clamp(m.power + (RATES_PER_HOUR.powerUsed + solar) / 60);
    if (m.power <= 0) powerWentOut = true;
    const made = m.power > 0 ? RATES_PER_HOUR.oxygenMade : 0; // no power, no new oxygen
    m.oxygen = clamp(m.oxygen + (RATES_PER_HOUR.oxygenBreathed + made) / 60);
    m.food = clamp(m.food + RATES_PER_HOUR.foodEaten / 60);
    const wear = RATES_PER_HOUR.shieldingWear * (solarStorm ? RADIATION.stormShieldingWearMultiplier : 1);
    m.shielding = clamp(m.shielding + wear / 60);
    s.radiationMsv += doseRatePerDay(s.world, m.shielding, solarStorm) / (24 * 60);

    s.minuteOfSol += 1;
    if (s.minuteOfSol >= solLength) {
      // A new sol begins.
      s.sol += 1;
      s.minuteOfSol = 0;
      s.workMinutesLeft = MISSION.workMinutesPerSol;
      s.rats.fedToday = false;
      // Rats left unprotected through a solar storm night: the data is spoiled.
      if (ratsExposed) {
        s.research = Math.max(0, s.research - 1);
        ratsSpoiled = true;
      }
      if (s.sol > MISSION.sols) {
        s.status = "won";
        break;
      }
    }
    if (evacuationReason(m)) break;
  }

  // One log line summarising what changed while time passed.
  const changes: Effects = {};
  for (const key of METER_KEYS) {
    const diff = round1(s.meters[key] - before[key]);
    if (diff !== 0) changes[key] = diff;
  }
  if (s.research !== state.research) changes.research = s.research - state.research;
  const notes: string[] = [];
  if (storm) notes.push("dust storm: weak solar power");
  if (solarStorm) notes.push("solar storm: high radiation");
  notes.push(`radiation +${(s.radiationMsv - state.radiationMsv).toFixed(2)} mSv`);
  let text = `${formatMinutes(minutes)} passed (${notes.join("; ")})`;
  if (powerWentOut) text += ". Battery empty: the oxygen generator stopped";
  if (ratsSpoiled) text += ". The rats weren't in the shielded room during the solar storm, so the experiment data was spoiled";
  let result = addLog(s, text, changes);

  if (result.status === "won") {
    const goal = result.research >= MISSION.researchGoal ? "Research goal reached!" : "Research goal missed.";
    result = addLog(result, `Mission complete: the relief crew has arrived. ${goal}`);
    result = addLog(
      result,
      `Crew radiation dose: ${result.radiationMsv.toFixed(1)} mSv. NASA's career limit for astronauts is 600 mSv.`
    );
  }
  return checkStatus(result);
}

// ---------- actions ----------

// The player does something at a station. Time passes first (the meters
// keep changing while the crew works or waits), then the effects apply.
export function doAction(state: GameState, actionId: string): GameState {
  const check = canDoAction(state, actionId);
  if (!check.ok) return addLog(state, `Can't do that: ${check.reason}`);

  const action = getAction(actionId);
  if (!action) return state; // already ruled out by canDoAction
  const minutes = actionMinutes(actionId, state.world);

  let s: GameState = { ...state, workMinutesLeft: state.workMinutesLeft - minutes };
  // The rats count as sheltered from the moment the crew starts moving them.
  if (actionId === "protectRats") s = { ...s, flags: [...s.flags, ENGINE_FLAGS.ratsSheltered] };
  s = advanceTime(s, minutes);
  if (s.status !== "playing") return s;

  if (actionId === "feedRats") s = { ...s, rats: { ...s.rats, fedToday: true } };

  const label =
    actionId === "callHouston"
      ? state.world === "mars"
        ? `Called Houston by voice message: the answer took ${formatMinutes(minutes)} to come back`
        : `Called Houston (${formatMinutes(minutes)})`
      : action.label;
  return applyEffects(s, action.effects, label);
}

// The crew sleeps until 8:00 the next sol. Power keeps draining at night.
export function endDay(state: GameState): GameState {
  if (state.status !== "playing") return state;
  const minutes = SOL_LENGTH_MINUTES[state.world] - state.minuteOfSol + WORKDAY_START;
  return advanceTime(state, minutes);
}