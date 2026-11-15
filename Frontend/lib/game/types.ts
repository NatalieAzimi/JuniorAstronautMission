// =====================================================================
// types.ts — the CONTRACT between game logic (lib/game) and the screens.
// Front end: build against these shapes. Ask before changing them.
// =====================================================================

export type World = "mars" | "moon";
export type Status = "playing" | "won" | "evacuated";

// The survival meters. All 0–100.
// Life support is NOT stored: it is calculated as the lower of oxygen and food.
export type Meters = {
  oxygen: number;    // 0 = no air left, 100 = tank full
  food: number;      // 0 = no food left, 100 = fully stocked
  power: number;     // battery: 0 = empty, 100 = fully charged
  shielding: number; // radiation protection: 0 = unprotected, 100 = fully protected
};

// What a choice or action changes. Every field is optional.
// Numbers are CHANGES, e.g. { power: -10, research: 2 }.
export type Effects = Partial<Meters> & {
  research?: number;
  // Add new effect fields here (e.g. solarMultiplier) instead of
  // writing special-case code for one event.
};

// When an event is allowed to happen. Every field is optional.
export type Condition = {
  world?: World;
  minSol?: number;
  maxSol?: number;
  timeOfDay?: "day" | "night";
  hasFlag?: string;          // only if this flag was set earlier
  missingFlag?: string;      // only if this flag was NOT set
  below?: Partial<Meters>;   // e.g. { power: 30 } = only when power < 30
};

export type Fact = {
  text: string;   // the real science, in plain words
  source: string; // e.g. "NASA JPL"
  url?: string;
};

export type Choice = {
  label: string;      // button text
  minutes?: number;   // crew time it costs (default 0)
  effects?: Effects;
  result?: string;    // what the narrator says after this choice
  next?: string;      // id of a follow-up event (branching)
  flag?: string;      // remember this choice for later events
};

export type GameEvent = {
  id: string;
  text: string;
  choices: Choice[];
  speaker?: string;     // who says it: narrator, engineer, doctor...
  chance?: number;      // 0–1 chance per sol (default: scripted only)
  onlyIf?: Condition;
  fact?: Fact;
};

// Things the player does at a station (walk up, press E).
export type Action = {
  id: string;        // e.g. "callHouston"
  label: string;     // button text
  station: string;   // e.g. "comms", "greenhouse", "lab"
  minutes: number;   // crew time it costs
  effects: Effects;
};

export type RatLab = {
  fedToday: boolean;
  // Sheltered or not is the "ratsSheltered" flag (see ENGINE_FLAGS in engine.ts).
};

// One line in the "why it happened" log.
export type LogEntry = {
  sol: number;
  minute: number;      // minutes into the sol
  text: string;        // e.g. "Grow lights off: power +8, food -5"
  changes?: Effects;
};

// Everything about one playthrough. Plain data only, so saving is
// just JSON.stringify(state) into localStorage.
export type GameState = {
  world: World;
  seed: number;              // makes random events repeatable for testing
  sol: number;               // which day (starts at 1)
  minuteOfSol: number;       // clock: minutes since the sol started
  workMinutesLeft: number;   // crew time left today
  meters: Meters;
  research: number;
  radiationMsv: number;      // crew radiation dose so far, in millisieverts (a REAL unit)
  rats: RatLab;
  flags: string[];
  activeEventId: string | null;
  log: LogEntry[];
  status: Status;
};