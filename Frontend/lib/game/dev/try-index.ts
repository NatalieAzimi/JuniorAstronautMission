// Test of index.ts, the functions the screens will call.
// Run from the Frontend folder:  npx tsx lib/game/dev/try-index.ts

import {
  canDoAction,
  chooseOption,
  clockText,
  currentEvent,
  doAction,
  loadGame,
  nextDay,
  saveGame,
  startGame,
  tryAgain,
  whyBlocked,
  whyEvacuated,
  type Game,
} from "../index";
import { applyEffects } from "../engine";

function show(label: string, g: Game) {
  const m = g.state.meters;
  const event = currentEvent(g);
  console.log(
    `${label.padEnd(26)} ${clockText(g.state).padEnd(13)} O2 ${m.oxygen.toFixed(1).padStart(5)}  ` +
      `power ${m.power.toFixed(1).padStart(5)}  research ${g.state.research}  [${g.state.status}]` +
      (event ? `  EVENT: ${event.id}` : "")
  );
}

// A fake localStorage, because the terminal has no browser.
const memory = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
};

let g = startGame("mars", 7);
show("1. start", g);
console.log("   study before feeding? ", canDoAction(g, "studyRats").reason);
g = doAction(g, "feedRats");
g = doAction(g, "studyRats");
g = doAction(g, "callHouston");
show("2. fed, studied, called", g);

g = nextDay(g);
show("3. next day", g);
const before = g;
g = doAction(g, "tendGreenhouse");
console.log("   act during event?     ", whyBlocked(g), "| unchanged:", g === before);
g = chooseOption(g, 0);
show("4. charged batteries", g);

console.log("   saved (fake storage)? ", saveGame(g, fakeStorage));
const loaded = loadGame(fakeStorage);
console.log("   loaded the same game? ", JSON.stringify(loaded) === JSON.stringify(g));
console.log("   save in terminal?     ", saveGame(g), "(no browser here, so false is right)");
memory.set("junior-astronaut-save", "{broken json");
console.log("   broken save loads as: ", loadGame(fakeStorage));

g = nextDay(g);
show("5. next day", g);
g = chooseOption(g, 1); // quick patch -> leak
g = chooseOption(g, 1); // ignore it
show("6. patched, ignored leak", g);

// Force a loss to test the evacuation screen and "try again".
g = { ...g, state: applyEffects(g.state, { oxygen: -100 }, "TEST: tank emptied") };
show("7. forced loss", g);
console.log("   why:", whyEvacuated(g));
show("8. try again (today)", tryAgain(g, "today"));
show("9. try again (yesterday)", tryAgain(g, "yesterday"));

// Play the rest from yesterday, always picking the first choice.
g = tryAgain(g, "yesterday");
while (g.state.status === "playing") {
  while (currentEvent(g)) g = chooseOption(g, 0);
  g = nextDay(g);
}
show("10. played to the end", g);
console.log("   last log:", g.state.log[g.state.log.length - 1].text);