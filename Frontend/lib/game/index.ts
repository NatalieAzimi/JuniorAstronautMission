// =====================================================================
// index.ts — the ONLY file the screens (React / Phaser) import from.
//
//   import { startGame, doAction, chooseOption, nextDay, ... } from "@/lib/game";
//
// Every function takes a Game and returns a NEW Game (never edits it),
// so it fits straight into React state:
//
//   const [game, setGame] = useState<Game | null>(null);
//   useEffect(() => setGame(loadGame() ?? startGame("mars")), []);
//   useEffect(() => { if (game) saveGame(game); }, [game]);   // auto-save
//   setGame((g) => g && doAction(g, "tendGreenhouse"));
//
// Display helpers (clockText, lifeSupport, ...) take game.state.
// No React, Next.js or Phaser in this file.
// =====================================================================

import type { GameEvent, GameState, World } from "./types";
import * as engine from "./engine";
import * as story from "./events";
// Story events. When the real story file is ready, change ONLY this line.
import storyJson from "./data/events-test.json";

export type Game = {
  state: GameState; // what is happening right now
  mornings: GameState[]; // a snapshot from the start of every sol, for "try again"
};

export const EVENTS: GameEvent[] = story.loadEvents(storyJson);

// ---------- what can the player do right now? ----------

// Why the player can't act right now, or null if they can.
export function whyBlocked(game: Game): string | null {
  if (game.state.status === "won") return "The mission is complete.";
  if (game.state.status === "evacuated") return "The crew was evacuated.";
  if (game.state.activeEventId) return "Answer the message first.";
  return null;
}

// The event waiting for an answer, or null.
export function currentEvent(game: Game): GameEvent | null {
  return story.getActiveEvent(game.state, EVENTS);
}

// Use this to grey out a station button and show the reason.
export function canDoAction(game: Game, actionId: string): { ok: boolean; reason?: string } {
  const blocked = whyBlocked(game);
  if (blocked) return { ok: false, reason: blocked };
  return engine.canDoAction(game.state, actionId);
}

// ---------- playing ----------

export function startGame(world: World = "mars", seed: number = Date.now()): Game {
  const state = story.rollEvent(engine.newGame(world, seed), EVENTS);
  return { state, mornings: [state] };
}

export function doAction(game: Game, actionId: string): Game {
  if (!canDoAction(game, actionId).ok) return game; // nothing happens
  return { ...game, state: engine.doAction(game.state, actionId) };
}

export function chooseOption(game: Game, choiceIndex: number): Game {
  if (!currentEvent(game)) return game;
  return { ...game, state: story.chooseOption(game.state, EVENTS, choiceIndex) };
}

// Sleep until 8:00 next sol, then roll for the morning's event.
export function nextDay(game: Game): Game {
  if (whyBlocked(game)) return game;
  let state = engine.endDay(game.state);
  if (state.status !== "playing") return { ...game, state };
  state = story.rollEvent(state, EVENTS);
  return { state, mornings: [...game.mornings, state] };
}

// ---------- losing is not the end ----------

// Plain-language reason plus a tip, for the evacuation screen.
export function whyEvacuated(game: Game): { reason: string; tip: string } | null {
  if (game.state.status !== "evacuated") return null;
  const m = game.state.meters;
  if (m.oxygen <= 0) {
    return {
      reason: "The oxygen ran out.",
      tip: "The oxygen machine needs power. Keep the battery charged, and service the oxygen station.",
    };
  }
  if (m.food <= 0) {
    return { reason: "The food ran out.", tip: "Tend the greenhouse so the crew keeps having food." };
  }
  return {
    reason: "The radiation shielding wore out.",
    tip: "Build shielding at the airlock before it gets too thin.",
  };
}

// Go back to the start of today, or of yesterday, and try again.
// The same events come back, so the player can pick differently.
export function tryAgain(game: Game, from: "today" | "yesterday" = "yesterday"): Game {
  const today = game.state.sol;
  const sol = from === "yesterday" ? Math.max(1, today - 1) : today;
  const index = game.mornings.findIndex((s) => s.sol === sol);
  if (index === -1) return game;
  const morning = game.mornings[index];
  const state: GameState = {
    ...morning,
    log: [
      ...morning.log,
      { sol: morning.sol, minute: morning.minuteOfSol, text: `Trying again from the morning of Sol ${sol}.` },
    ],
  };
  return { state, mornings: game.mornings.slice(0, index + 1) };
}

// ---------- saving (browser cache, no login) ----------

const SAVE_KEY = "junior-astronaut-save";
const SAVE_VERSION = 1; // bump this if GameState changes; old saves are then ignored

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

// The browser's localStorage, or null on the server / when it's blocked.
function browserStorage(): StorageLike | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // private browsing or storage turned off
  }
  return null;
}

// Returns true if it saved.
export function saveGame(game: Game, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, game }));
    return true;
  } catch {
    return false; // storage full or blocked
  }
}

// Returns the saved game, or null if there is none (or it's broken / too old).
export function loadGame(storage: StorageLike | null = browserStorage()): Game | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const game = data?.game;
    if (data?.version !== SAVE_VERSION) return null;
    if (typeof game?.state?.meters !== "object" || !Array.isArray(game?.mornings)) return null;
    return game as Game;
  } catch {
    return null;
  }
}

export function deleteSave(storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // nothing to do
  }
}

// ---------- re-exports, so screens never import the other files ----------

export type { Action, Effects, GameEvent, GameState, LogEntry, Meters, World } from "./types";
export { ACTIONS, MISSION } from "./config";
export {
  actionMinutes,
  actionsAt,
  callHoustonMinutes,
  clockText,
  formatMinutes,
  isDaylight,
  lifeSupport,
} from "./engine";