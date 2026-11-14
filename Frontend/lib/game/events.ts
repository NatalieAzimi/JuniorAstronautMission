// =====================================================================
// events.ts — the story system: load events from JSON, roll random
// events each sol, apply the player's choice.
// Story text lives in data/*.json, never in this file.
//
// Rules for the story writers (also in the JSON guide):
//   • chance: 0–1 chance per sol. chance 1 + minSol/maxSol = guaranteed
//     on that sol. No chance = only reachable through a choice's "next".
//   • Each event happens at most once per game.
//   • flag: "dustStorm" turns a flag ON, flag: "!dustStorm" turns it OFF.
//   • Every choice should cost something (time or a meter going down).
// =====================================================================

import type { Choice, Condition, GameEvent, GameState } from "./types";
import { advanceTime, applyEffects, isDaylight } from "./engine";

const EVENT_FIELDS = ["id", "text", "choices", "speaker", "chance", "onlyIf", "fact"];
const CHOICE_FIELDS = ["label", "minutes", "effects", "result", "next", "flag"];

// ---------- loading (the only place that knows the JSON format) ----------

function costsSomething(c: Choice): boolean {
  if ((c.minutes ?? 0) > 0) return true;
  return Object.values(c.effects ?? {}).some((v) => typeof v === "number" && v < 0);
}

// Turns raw JSON into checked GameEvents. Warns loudly about mistakes
// instead of crashing, so a typo in the story never breaks the game.
export function loadEvents(raw: unknown): GameEvent[] {
  if (!Array.isArray(raw)) {
    console.warn("[events] Expected a list of events.");
    return [];
  }
  const events: GameEvent[] = [];

  raw.forEach((item, i) => {
    if (typeof item !== "object" || item === null) {
      console.warn(`[events] Item #${i} is not an event, skipped.`);
      return;
    }
    const e = item as Record<string, unknown>;
    const where = `event "${String(e.id ?? `#${i}`)}"`;

    for (const key of Object.keys(e)) {
      if (!EVENT_FIELDS.includes(key)) console.warn(`[events] ${where}: unknown field "${key}" (ignored).`);
    }
    if (typeof e.id !== "string" || typeof e.text !== "string" || !Array.isArray(e.choices)) {
      console.warn(`[events] ${where}: needs "id", "text" and "choices", skipped.`);
      return;
    }

    const choices: Choice[] = [];
    e.choices.forEach((c, j) => {
      const choice = c as Record<string, unknown>;
      if (typeof choice?.label !== "string") {
        console.warn(`[events] ${where}: choice #${j} has no "label", skipped.`);
        return;
      }
      for (const key of Object.keys(choice)) {
        if (!CHOICE_FIELDS.includes(key)) console.warn(`[events] ${where}: choice "${choice.label}" has unknown field "${key}".`);
      }
      if (!costsSomething(choice as Choice)) {
        console.warn(`[events] ${where}: choice "${choice.label}" costs nothing (rule: no free choices).`);
      }
      choices.push(choice as Choice);
    });
    if (choices.length === 0) {
      console.warn(`[events] ${where}: no valid choices, skipped.`);
      return;
    }
    events.push({ ...(e as GameEvent), choices });
  });

  // Check that every "next" points to an event that exists.
  const ids = new Set(events.map((ev) => ev.id));
  for (const ev of events) {
    for (const c of ev.choices) {
      if (c.next && !ids.has(c.next)) {
        console.warn(`[events] "${ev.id}": choice "${c.label}" points to missing event "${c.next}".`);
      }
    }
  }
  return events;
}

// ---------- random numbers you can repeat ----------

// Same seed + same sol = same rolls, so testers can replay a run.
function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- conditions and flags ----------

function conditionMet(state: GameState, c: Condition | undefined): boolean {
  if (!c) return true;
  if (c.world && c.world !== state.world) return false;
  if (c.minSol !== undefined && state.sol < c.minSol) return false;
  if (c.maxSol !== undefined && state.sol > c.maxSol) return false;
  if (c.timeOfDay === "day" && !isDaylight(state)) return false;
  if (c.timeOfDay === "night" && isDaylight(state)) return false;
  if (c.hasFlag && !state.flags.includes(c.hasFlag)) return false;
  if (c.missingFlag && state.flags.includes(c.missingFlag)) return false;
  if (c.below) {
    for (const [key, limit] of Object.entries(c.below)) {
      const value = state.meters[key as keyof GameState["meters"]];
      if (typeof limit === "number" && !(value < limit)) return false;
    }
  }
  return true;
}

// "dustStorm" turns a flag on, "!dustStorm" turns it off.
function setFlag(state: GameState, flag: string): GameState {
  if (flag.startsWith("!")) {
    const name = flag.slice(1);
    return { ...state, flags: state.flags.filter((f) => f !== name) };
  }
  if (state.flags.includes(flag)) return state;
  return { ...state, flags: [...state.flags, flag] };
}

const seenFlag = (id: string) => `seen:${id}`;

// ---------- running events ----------

export function getActiveEvent(state: GameState, events: GameEvent[]): GameEvent | null {
  if (!state.activeEventId) return null;
  return events.find((e) => e.id === state.activeEventId) ?? null;
}

// Show a specific event now (used for "next" branches, or by the screens).
export function startEvent(state: GameState, events: GameEvent[], id: string): GameState {
  const event = events.find((e) => e.id === id);
  if (!event || state.status !== "playing") return state;
  const s = setFlag({ ...state, activeEventId: id }, seenFlag(id));
  return { ...s, log: [...s.log, { sol: s.sol, minute: s.minuteOfSol, text: `Event: ${event.text}` }] };
}

// Roll for a random event. Call once each morning. At most one event
// per roll; events whose conditions aren't met are never picked.
export function rollEvent(state: GameState, events: GameEvent[]): GameState {
  if (state.status !== "playing" || state.activeEventId) return state;
  const random = makeRandom(state.seed * 31 + state.sol * 1009 + state.minuteOfSol);
  for (const event of events) {
    if (typeof event.chance !== "number") continue; // only reachable via "next"
    if (state.flags.includes(seenFlag(event.id))) continue; // once per game
    if (!conditionMet(state, event.onlyIf)) continue;
    if (random() < event.chance) return startEvent(state, events, event.id);
  }
  return state;
}

// The player picked a choice for the active event.
export function chooseOption(state: GameState, events: GameEvent[], choiceIndex: number): GameState {
  const event = getActiveEvent(state, events);
  const choice = event?.choices[choiceIndex];
  if (!event || !choice) return state;

  let s: GameState = { ...state, activeEventId: null };
  const minutes = choice.minutes ?? 0;
  if (minutes > 0) {
    s = { ...s, workMinutesLeft: Math.max(0, s.workMinutesLeft - minutes) };
    s = advanceTime(s, minutes); // meters keep changing while the crew deals with it
    if (s.status !== "playing") return s;
  }
  s = applyEffects(s, choice.effects ?? {}, choice.result ?? choice.label);
  if (s.status !== "playing") return s;
  if (choice.flag) s = setFlag(s, choice.flag);
  if (choice.next) s = startEvent(s, events, choice.next);
  return s;
}