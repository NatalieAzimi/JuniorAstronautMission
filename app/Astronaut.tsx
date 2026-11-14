"use client";

import { useEffect, useRef, useState } from "react";

type Pose = "front" | "angle" | "side";

const SRC: Record<Pose, string> = {
  front: "/astronaut-front.png",
  angle: "/astronaut-angle.png",
  side: "/astronaut-side.png",
};

// Walkable ground, as fractions of the window (0 to 1)
const X_MIN = 0.07;
const X_MAX = 0.93;
const Y_MIN = 0.64;
const Y_MAX = 0.96;
const SPEED_X = 0.32; // window widths per second
const SPEED_Y = 0.22; // window heights per second

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function Astronaut({ name }: { name: string }) {
  const layer = useRef<HTMLDivElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0.5, y: 0.85 });
  const target = useRef<{ x: number; y: number } | null>(null);
  const keys = useRef(new Set<string>());

  const [pose, setPose] = useState<Pose>("front");
  const [flip, setFlip] = useState(false);
  const [walking, setWalking] = useState(false);

  useEffect(() => {
    const el = layer.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(t.tagName);

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        if (k.startsWith("arrow")) e.preventDefault(); // stop the page from scrolling
        keys.current.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const onBlur = () => keys.current.clear();

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, input")) return;
      const r = parent.getBoundingClientRect();
      target.current = {
        x: clamp((e.clientX - r.left) / r.width, X_MIN, X_MAX),
        y: clamp((e.clientY - r.top) / r.height, Y_MIN, Y_MAX),
      };
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    parent.addEventListener("pointerdown", onPointerDown);

    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = keys.current;
      let mx = 0;
      let my = 0;

      const dx = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0);
      const dy = (k.has("arrowdown") || k.has("s") ? 1 : 0) - (k.has("arrowup") || k.has("w") ? 1 : 0);

      if (dx || dy) {
        target.current = null;
        const diag = dx && dy ? 0.75 : 1;
        mx = dx * SPEED_X * dt * diag;
        my = dy * SPEED_Y * dt * diag;
      } else if (target.current) {
        const tx = target.current.x - pos.current.x;
        const ty = target.current.y - pos.current.y;
        mx = clamp(tx, -SPEED_X * dt, SPEED_X * dt);
        my = clamp(ty, -SPEED_Y * dt, SPEED_Y * dt);
        if (Math.abs(tx) < 0.001 && Math.abs(ty) < 0.001) target.current = null;
      }

      pos.current.x = clamp(pos.current.x + mx, X_MIN, X_MAX);
      pos.current.y = clamp(pos.current.y + my, Y_MIN, Y_MAX);

      const moving = Math.abs(mx) > 0.00001 || Math.abs(my) > 0.00001;
      setWalking(moving);
      if (moving) {
        if (Math.abs(mx) > 0.00001) {
          setPose("side");
          setFlip(mx < 0); // the side sprite faces right, so flip it to face left
        } else {
          setPose(my > 0 ? "front" : "angle"); // there's no back view, so up uses the angled one
        }
      } else {
        setPose("front");
      }

      // Things farther up the screen are farther away, so they look smaller
      const depth = (pos.current.y - Y_MIN) / (Y_MAX - Y_MIN);
      const s = sprite.current;
      if (s) {
        s.style.left = `${pos.current.x * 100}%`;
        s.style.top = `${pos.current.y * 100}%`;
        s.style.transform = `translate(-50%, -100%) scale(${0.75 + 0.35 * depth})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      parent.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div ref={layer} className="astro-layer">
      <div ref={sprite} className="astro" style={{ left: "50%", top: "85%" }}>
        <span className="astro-name">{name}</span>
        <span className={`astro-flip ${flip ? "flip" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SRC[pose]}
            alt={`Astronaut ${name}`}
            className={`astro-img ${walking ? "walking" : ""}`}
            draggable={false}
          />
        </span>
        <span className="astro-shadow" />
      </div>
      <p className="move-tip">Move with arrow keys / WASD, or click where to walk</p>
    </div>
  );
}