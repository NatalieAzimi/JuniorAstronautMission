// Quick test of the game logic, no website needed.
// Run from the Frontend folder:  npx tsx lib/game/dev/try.ts

import type { GameState } from "../types";
import { ENGINE_FLAGS, canDoAction, clockText, doAction, endDay, lifeSupport, newGame } from "../engine";

function show(label: string, s: GameState) {
  const m = s.meters;
  console.log(
    `${label.padEnd(26)} ${clockText(s).padEnd(13)} ` +
      `O2 ${m.oxygen.toFixed(1).padStart(5)}  food ${m.food.toFixed(1).padStart(5)}  ` +
      `power ${m.power.toFixed(1).padStart(5)}  shield ${m.shielding.toFixed(1).padStart(5)}  ` +
      `life support ${lifeSupport(s).toFixed(1).padStart(5)}  research ${s.research}  ` +
      `work left ${String(s.workMinutesLeft).padStart(3)} min  [${s.status}]`
  );
}

let s = newGame("mars", 1);
show("Start", s);

console.log("Can study rats before feeding?", canDoAction(s, "studyRats"));
s = doAction(s, "feedRats");
show("Fed the rats", s);
s = doAction(s, "studyRats");
show("Studied the rats", s);
s = doAction(s, "callHouston");
show("Called Houston (Mars)", s);
s = doAction(s, "tendGreenhouse");
show("Tended greenhouse", s);
s = endDay(s);
show("Slept until morning", s);

// Simulate a dust storm and do nothing about it.
s = { ...s, flags: [...s.flags, ENGINE_FLAGS.dustStorm] };
while (s.status === "playing") {
  s = endDay(s);
  show("Dust storm, did nothing", s);
}

console.log("\nLast 6 log lines (the 'why' log):");
for (const e of s.log.slice(-6)) console.log(`  Sol ${e.sol}: ${e.text}`);