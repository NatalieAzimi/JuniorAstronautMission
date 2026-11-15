// Test of radiation and the lab rats. Uses the engine directly, so the
// test story events don't pop up and get in the way.
// Run from the Frontend folder:  npx tsx lib/game/try-radiation.ts

import type { GameState } from "./types";
import {
  canDoAction,
  doAction,
  endDay,
  ENGINE_FLAGS,
  newGame,
  radiationPerDay,
  ratsInDanger,
} from "./engine";

function show(label: string, s: GameState) {
  console.log(
    `${label.padEnd(30)} radiation ${radiationPerDay(s).toFixed(2).padStart(5)} mSv/day  ` +
      `total ${s.radiationMsv.toFixed(2).padStart(5)} mSv  shield ${s.meters.shielding.toFixed(1).padStart(4)}  ` +
      `research ${s.research}  rats in danger: ${ratsInDanger(s)}`
  );
}

// Turn a flag on, the way a story event's choice would.
const withFlag = (s: GameState, flag: string): GameState => ({ ...s, flags: [...s.flags, flag] });
const lastLog = (s: GameState) => s.log[s.log.length - 1].text;

// 1. A normal sol on Mars.
let a = newGame("mars", 1);
show("1. Mars, start", a);
a = endDay(a);
show("   after 1 sol", a);

// 2. Solar storm, rats NOT protected.
let b = newGame("mars", 1);
b = doAction(b, "feedRats");
b = doAction(b, "studyRats");
show("2. Studied rats", b);
b = withFlag(b, ENGINE_FLAGS.solarStorm);
show("   solar storm starts", b);
console.log("   study now?    ", canDoAction(b, "studyRats").reason);
b = endDay(b);
show("   slept, rats unprotected", b);
console.log("   log:", lastLog(b));

// 3. Same storm, but protect the rats.
let c = newGame("mars", 1);
c = withFlag(c, ENGINE_FLAGS.solarStorm);
c = doAction(c, "protectRats");
console.log("3. protect twice?", canDoAction(c, "protectRats").reason);
c = doAction(c, "feedRats");
c = doAction(c, "studyRats");
show("   rats protected, studied", c);
c = endDay(c);
show("   slept, rats protected", c);

// 4. Building shielding lowers the dose.
let d = withFlag(newGame("mars", 1), ENGINE_FLAGS.solarStorm);
show("4. Storm, shield 60", d);
d = doAction(d, "buildShield");
show("   after building shield", d);

// 5. The Moon gets more everyday radiation than Mars.
show("5. Moon, start", newGame("moon", 1));

// 6. Full mission: the dose is reported at the end.
let e = newGame("mars", 1);
while (e.status === "playing") e = endDay(e);
console.log("6.", lastLog(e));