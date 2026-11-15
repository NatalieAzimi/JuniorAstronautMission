// Checks a story file for mistakes before it goes into the game.
// Run from the Frontend folder:
//   npx tsx lib/game/check-story.ts lib/game/data/events-test.json
// (Terminal only. The game itself never imports this file.)

import { readFileSync } from "node:fs";
import { loadEvents } from "./events";

const METERS = ["oxygen", "food", "power", "shielding", "research"];
const CONDITIONS = ["world", "minSol", "maxSol", "timeOfDay", "hasFlag", "missingFlag", "below"];

const path = process.argv[2];
if (!path) {
  console.log("Usage: npx tsx lib/game/check-story.ts lib/game/data/<file>.json");
  process.exit(1);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(path, "utf8"));
} catch (err) {
  console.log(`PROBLEM: ${path} could not be read as JSON.\n  ${(err as Error).message}`);
  console.log("  Common causes: a missing comma, a comma after the last item, or curly quotes.");
  process.exit(1);
}

// Count the loader's own warnings too.
const problems: string[] = [];
const warn = console.warn;
console.warn = (...args: unknown[]) => problems.push(args.join(" ").replace("[events] ", ""));
const events = loadEvents(raw);
console.warn = warn;

// Extra checks for common writing mistakes.
type Loose = Record<string, unknown>;
const seenIds = new Set<string>();
const flagsTurnedOn = new Set<string>();
const nextTargets = new Set<string>();
for (const e of events) {
  for (const c of e.choices) {
    if (c.flag && !c.flag.startsWith("!")) flagsTurnedOn.add(c.flag);
    if (c.next) nextTargets.add(c.next);
  }
}

for (const e of events) {
  const where = `event "${e.id}"`;
  if (seenIds.has(e.id)) problems.push(`${where}: this id is used twice.`);
  seenIds.add(e.id);

  if (e.chance !== undefined && (typeof e.chance !== "number" || e.chance < 0 || e.chance > 1)) {
    problems.push(`${where}: chance must be a number from 0 to 1 (0.25 = 25%).`);
  }
  if (e.chance === undefined && !nextTargets.has(e.id)) {
    problems.push(`${where}: has no chance and no choice points to it, so it can never happen.`);
  }

  const cond = (e.onlyIf ?? {}) as Loose;
  for (const key of Object.keys(cond)) {
    if (!CONDITIONS.includes(key)) problems.push(`${where}: unknown onlyIf field "${key}".`);
  }
  if (cond.world !== undefined && cond.world !== "mars" && cond.world !== "moon") {
    problems.push(`${where}: world must be "mars" or "moon".`);
  }
  if (typeof cond.hasFlag === "string" && !flagsTurnedOn.has(cond.hasFlag)) {
    problems.push(`${where}: needs flag "${cond.hasFlag}", but no choice ever turns it on.`);
  }
  for (const key of Object.keys((cond.below ?? {}) as Loose)) {
    if (!METERS.includes(key) || key === "research") problems.push(`${where}: unknown meter "${key}" in below.`);
  }

  if (e.fact && (!e.fact.text || !e.fact.source)) {
    problems.push(`${where}: a fact needs both "text" and "source".`);
  }
  if (e.text.length > 300) problems.push(`${where}: text is long (${e.text.length} characters). Kids may skip it.`);

  for (const c of e.choices) {
    const choice = `${where}, choice "${c.label}"`;
    if (c.minutes !== undefined && (typeof c.minutes !== "number" || c.minutes < 0)) {
      problems.push(`${choice}: minutes must be a number like 30 or 120.`);
    }
    for (const [key, value] of Object.entries((c.effects ?? {}) as Loose)) {
      if (!METERS.includes(key)) problems.push(`${choice}: unknown effect "${key}" (spelling?).`);
      else if (typeof value !== "number") problems.push(`${choice}: effect "${key}" must be a number.`);
    }
  }
}

// Summary
const count = (test: (e: (typeof events)[number]) => boolean) => events.filter(test).length;
console.log(`${path}`);
console.log(
  `  ${events.length} events: ${count((e) => e.onlyIf?.world === "mars")} Mars only, ` +
    `${count((e) => e.onlyIf?.world === "moon")} Moon only, ${count((e) => !e.onlyIf?.world)} both worlds`
);
console.log(
  `  ${count((e) => e.chance === 1)} guaranteed, ${count((e) => typeof e.chance === "number" && e.chance < 1)} random, ` +
    `${count((e) => e.chance === undefined)} only through "next"`
);
if (problems.length === 0) {
  console.log("  No problems found.");
} else {
  console.log(`  ${problems.length} problem(s):`);
  for (const p of problems) console.log(`   - ${p}`);
}