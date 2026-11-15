// =====================================================================
// lib/sfx.ts  (NEW)
// Tiny retro sound effects made with the Web Audio API (no sound files
// to download, so it stays fast). Volume comes from Settings → SOUNDS.
// =====================================================================

import { getSettings } from "./settings";

export type Sfx = "click" | "move" | "done" | "break" | "fixed" | "error" | "fact" | "alarm" | "radio" | "win" | "lose";

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, a.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}

export function play(name: Sfx) {
  const level = getSettings().sounds / 10;
  if (level <= 0) return;
  const a = audio();
  if (!a) return;
  const v = 0.12 * level;
  switch (name) {
    case "click": return beep(a, 660, 0, 0.05, "square", v * 0.5);
    case "move": return beep(a, 440, 0, 0.04, "square", v * 0.4);
    case "done": beep(a, 523, 0, 0.08, "square", v); return beep(a, 784, 0.08, 0.12, "square", v);
    case "fixed": beep(a, 523, 0, 0.08, "triangle", v); beep(a, 659, 0.08, 0.08, "triangle", v); return beep(a, 1046, 0.16, 0.2, "triangle", v);
    case "fact": beep(a, 880, 0, 0.1, "sine", v); return beep(a, 1320, 0.1, 0.25, "sine", v);
    case "error": return beep(a, 180, 0, 0.18, "sawtooth", v * 0.6);
    case "break": beep(a, 300, 0, 0.15, "sawtooth", v, 120); return beep(a, 90, 0.12, 0.3, "square", v * 0.7);
    case "alarm": for (let i = 0; i < 3; i++) beep(a, 880, i * 0.3, 0.15, "square", v * 0.7, 660); return;
    case "radio": beep(a, 2525, 0, 0.2, "sine", v * 0.5); return; // NASA "Quindar" tone
    case "win": [523, 659, 784, 1046].forEach((f, i) => beep(a, f, i * 0.14, 0.25, "triangle", v)); return;
    case "lose": [392, 330, 262].forEach((f, i) => beep(a, f, i * 0.2, 0.3, "triangle", v)); return;
  }
}
