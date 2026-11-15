"use client";

/**
 * RepairGame.tsx  (NEW)
 * FILE LOCATION: Frontend/components/game/RepairGame.tsx
 * STYLES:        Frontend/components/game/game.css  (.rp-*)
 *
 * When a system breaks, walk to it and press SPACE:
 *   1. Pick how to fix it (every option costs something):
 *        🔧 proper fix  = uses the right spare part (permanent)
 *        🩹 duct tape   = cheap, but breaks again after a few jobs
 *        🛠 improvise   = no parts needed, but costs 10 battery and is only a patch
 *   2. Follow the repair steps by pressing the arrow keys (or tapping them).
 *      A wrong key starts the steps over. The mission clock keeps running!
 */

import { useEffect, useState } from "react";
import { BREAKDOWN, FAULTS, PARTS } from "@/lib/mission/config";
import type { PartId, SystemId } from "@/lib/mission/config";
import { IMPROVISE_BATTERY } from "@/lib/mission/sim";
import type { RepairMode } from "@/lib/mission/sim";
import { play } from "@/lib/sfx";

const ARROWS = ["↑", "↓", "←", "→"] as const;
const KEYMAP: Record<string, number> = { arrowup: 0, w: 0, arrowdown: 1, s: 1, arrowleft: 2, a: 2, arrowright: 3, d: 3 };
const STEP_WORDS = ["Unscrew the cover", "Pull out the old part", "Fit the new part", "Tighten the bolts", "Test the power", "Seal it up"];

export default function RepairGame({
  system,
  parts,
  onDone,
  onCancel,
}: {
  system: SystemId;
  parts: Record<PartId, number>;
  onDone: (mode: RepairMode) => void;
  onCancel: () => void;
}) {
  const fault = FAULTS[system];
  const need = fault.part;
  const [mode, setModeState] = useState<RepairMode | null>(null);
  const [steps, setSteps] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [shake, setShake] = useState(false);

  // pick the fix and roll a random set of repair steps (patches are shorter)
  function setMode(m: RepairMode) {
    const n = m === "part" ? fault.steps : Math.max(3, fault.steps - 1);
    setSteps(Array.from({ length: n }, () => Math.floor(Math.random() * 4)));
    setModeState(m);
  }

  const options: { mode: RepairMode; icon: string; label: string; cost: string; ok: boolean }[] = [
    { mode: "part", icon: "🔧", label: `Proper fix with a ${PARTS[need].name.toLowerCase()}`, cost: `Uses 1 of ${parts[need]} · permanent`, ok: parts[need] > 0 },
    { mode: "tape", icon: "🩹", label: "Quick patch with duct tape", cost: `Uses 1 of ${parts.tape} · fails after ~${BREAKDOWN.patchLastsTasks} jobs`, ok: parts.tape > 0 },
    { mode: "improvise", icon: "🛠", label: "Improvise with borrowed wires", cost: `−${IMPROVISE_BATTERY} battery · fails after ~${BREAKDOWN.patchLastsTasks} jobs`, ok: true },
  ];

  function press(dir: number) {
    if (mode === null) return;
    if (dir === steps[pos]) {
      play("click");
      if (pos + 1 >= steps.length) {
        play("fixed");
        onDone(mode);
      } else setPos(pos + 1);
    } else {
      play("error");
      setPos(0);
      setShake(true);
      window.setTimeout(() => setShake(false), 300);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (mode === null) {
        const i = ["1", "2", "3"].indexOf(k);
        if (i >= 0 && options[i].ok) {
          setMode(options[i].mode);
          play("click");
        }
        return;
      }
      if (k in KEYMAP) {
        e.preventDefault();
        if (!e.repeat) press(KEYMAP[k]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="rp-backdrop" role="dialog" aria-label={`Repair ${fault.name}`}>
      <div className={`rp-card og-frame ${shake ? "shake" : ""}`}>
        <p className="og-kicker">⚠ REPAIR JOB · the clock is still running!</p>
        <h2 className="rp-title">{fault.name}</h2>
        <p className="rp-text">{fault.problem} {fault.effect}</p>

        {mode === null ? (
          <div className="rp-options">
            {options.map((o, i) => (
              <button key={o.mode} className="rp-opt" disabled={!o.ok} onClick={() => { setMode(o.mode); play("click"); }}>
                <span className="rp-key">{i + 1}</span>
                <span className="rp-ico">{o.icon}</span>
                <span>
                  <b>{o.label}</b>
                  <small>{o.ok ? o.cost : "None left!"}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="rp-step">Step {pos + 1} of {steps.length}: <b>{STEP_WORDS[pos % STEP_WORDS.length]}</b>. Press the arrows in order:</p>
            <div className="rp-seq">
              {steps.map((d, i) => (
                <span key={i} className={`rp-arrow ${i < pos ? "ok" : i === pos ? "now" : ""}`}>{ARROWS[d]}</span>
              ))}
            </div>
            <div className="rp-pad">
              {[0, 2, 1, 3].map((d) => (
                <button key={d} className="rp-padbtn" onClick={() => press(d)} aria-label={`Arrow ${ARROWS[d]}`}>{ARROWS[d]}</button>
              ))}
            </div>
          </>
        )}
        <button className="og-btn rp-cancel" onClick={onCancel}>ESC · stop repairing</button>
      </div>
    </div>
  );
}
