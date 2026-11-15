"use client";

/**
 * BackgroundMusic.tsx  (UPDATED)
 * ------------------------------------------------------------
 * FILE LOCATION:  Frontend/components/audio/BackgroundMusic.tsx
 * MUSIC FILE:     Frontend/public/audio/SpaceMusic.mp3
 *
 * FIXED: the old code looked for /audio/space-music.mp3 but the file is
 *        named SpaceMusic.mp3, so nothing played.
 * CHANGED: no on-screen music button any more. Volume is set in the
 *          Esc SETTINGS menu (MUSIC slider) and saved between visits.
 *
 * Browsers block sound until the player clicks, taps or presses a key,
 * so the music starts on the first interaction and then loops forever.
 * While Houston is speaking, the music dips so the voice is clear.
 * ------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { getSettings, subscribe } from "@/lib/settings";

const MUSIC_SRC = "/audio/SpaceMusic.mp3"; // path inside Frontend/public/
const MAX_VOLUME = 0.8; //  music slider at 10 = this loud
const DUCK = 0.3; //        while Houston talks, music plays at 30%

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = 0; // fades up to the slider level
    let duck = 1;
    let target = 0;

    const level = () => (getSettings().music / 10) * MAX_VOLUME * duck;
    // smooth volume changes (no clicks or jumps)
    const fade = window.setInterval(() => {
      target = level();
      const v = audio.volume + (target - audio.volume) * 0.25;
      audio.volume = Math.max(0, Math.min(1, Math.abs(v - target) < 0.005 ? target : v));
      if (target === 0 && !audio.paused && audio.volume < 0.01) audio.pause();
    }, 80);

    const tryPlay = () => {
      if (getSettings().music === 0) return;
      if (audio.paused) audio.play().catch(() => {});
    };
    const events: (keyof DocumentEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => document.addEventListener(e, tryPlay, { passive: true }));

    // when the MUSIC slider moves from 0 back up, start again
    const unsub = subscribe(() => {
      if (getSettings().music > 0) tryPlay();
    });

    // dip under Houston's voice
    const speech = window.setInterval(() => {
      duck = window.speechSynthesis?.speaking ? DUCK : 1;
    }, 250);

    return () => {
      events.forEach((e) => document.removeEventListener(e, tryPlay));
      unsub();
      window.clearInterval(fade);
      window.clearInterval(speech);
    };
  }, []);

  return <audio ref={audioRef} src={MUSIC_SRC} preload="auto" loop />;
}
