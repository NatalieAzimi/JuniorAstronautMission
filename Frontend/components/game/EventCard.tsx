"use client";

/**
 * EventCard.tsx  (NEW)
 * FILE LOCATION: Frontend/components/game/EventCard.tsx
 * STYLES:        Frontend/components/game/game.css  (.ev-*)
 *
 * The Narrator's pop-up cards: day intros, end-of-day reports, solar
 * storm alerts (with the LIVE / ARCHIVED NASA DONKI badge), surprises
 * with choices, and Houston's replies. The mission pauses while one is open.
 */

import { useEffect } from "react";
import type { Card } from "@/lib/mission/sim";

export default function EventCard({ card, onChoose, onClose }: { card: Card; onChoose: (id: string) => void; onClose: () => void }) {
  const hasChoices = !!card.choices?.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (!hasChoices && (k === "Enter" || k === " " || k === "Escape")) {
        e.preventDefault();
        onClose();
      }
      if (hasChoices) {
        const i = Number(k) - 1;
        const c = card.choices![i];
        if (c && !c.disabled) {
          e.preventDefault();
          onChoose(c.id);
        }
      }
    };
    // small delay so the key that triggered the card doesn't close it instantly
    const id = window.setTimeout(() => window.addEventListener("keydown", onKey), 250);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [card, hasChoices, onChoose, onClose]);

  return (
    <div className="ev-backdrop" role="dialog" aria-label={card.title}>
      <div className={`ev-card og-frame ${card.kind}`}>
        <p className="og-kicker">{card.kicker}</p>
        <h2 className="ev-title">{card.title}</h2>
        {card.badge && (
          <p className={`ev-badge ${card.badge.live ? "live" : "arch"}`}>
            <b>{card.badge.live ? "● LIVE" : "◆ ARCHIVED"}</b> {card.badge.text.replace(/^(LIVE|ARCHIVED) /, "")}
          </p>
        )}
        <div className="ev-lines">
          {card.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        {card.fact && (
          <p className="ev-fact">
            <b>📘 DID YOU KNOW?</b> {card.fact.text} <span>({card.fact.credit})</span>
          </p>
        )}
        <div className="ev-btns">
          {hasChoices ? (
            card.choices!.map((c, i) => (
              <button key={c.id} className="ev-choice" disabled={c.disabled} onClick={() => onChoose(c.id)}>
                <span className="ev-key">{i + 1}</span>
                <span>
                  <b>{c.label}</b>
                  <small>{c.disabled ? "Not possible right now" : c.cost}</small>
                </span>
              </button>
            ))
          ) : (
            <button className="og-launch" onClick={onClose}>
              {card.kind === "day" ? "▶ START THE DAY" : card.kind === "storm" ? "▶ GO!" : "▶ CONTINUE"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
