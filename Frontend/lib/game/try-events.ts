// Quick test of the event system with the FAKE test events.
// Run from the Frontend folder:  npx tsx lib/game/try-events.ts

import type { GameState } from "./types";
import { clockText, endDay, newGame } from "./engine";
import { chooseOption, getActiveEvent, loadEvents, rollEvent } from "./events";
import testEvents from "./data/events-test.json";

const events = loadEvents(testEvents);
console.log(`Loaded ${events.length} test events.\n`);

function show(s: GameState) {
  const m = s.meters;
  console.log(
    `  ${clockText(s).padEnd(13)} O2 ${m.oxygen.toFixed(1)}  food ${m.food.toFixed(1)}  ` +
      `power ${m.power.toFixed(1)}  shield ${m.shielding.toFixed(1)}  research ${s.research}  ` +
      `flags [${s.flags.filter((f) => !f.startsWith("seen:")).join(", ")}]  [${s.status}]`
  );
}

// Play 5 sols. Always pick choice 2 (index 1) to test the branch.
let s = newGame("mars", 7);
while (s.status === "playing") {
  s = rollEvent(s, events);
  let event = getActiveEvent(s, events);
  while (event) {
    console.log(`${clockText(s)}  EVENT (${event.speaker}): ${event.text}`);
    console.log(`  -> picks: "${event.choices[1].label}"`);
    s = chooseOption(s, events, 1);
    event = getActiveEvent(s, events); // a "next" branch starts right away
  }
  show(s);
  s = endDay(s);
}

console.log("\nTesting the loader warnings with a broken event:");
loadEvents([
  { id: "broken", text: "Oops", choices: [{ label: "Free stuff", effects: { food: 5 } }], colour: "red" },
  { id: "noChoices", text: "Missing choices" },
]);