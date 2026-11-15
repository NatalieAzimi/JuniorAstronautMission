"use client";

/**
 * BackgroundMusic.tsx
 * ------------------------------------------------------------
 * FILE LOCATION:  Frontend/components/audio/BackgroundMusic.tsx
 * MUSIC FILE:     Frontend/public/audio/space-music.mp3
 * STYLES:         Frontend/components/audio/background-music.css
 *
 * Plays looping background music at a low volume for the whole app.
 *
 * Why it waits for a click/tap/key:
 *   Browsers (Chrome, Safari, Edge, Firefox) block sound from playing
 *   automatically until the person interacts with the page. So the music
 *   starts on the player's FIRST click, tap, or key press — usually the
 *   moment they press "Start" — and then keeps looping on every screen.
 *
 * Also adds a small 🔊 / 🔇 button in the bottom-right corner so kids,
 * parents or teachers can turn the music off. The choice is remembered.
 * ------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import "./background-music.css";

// ---- Settings you can change ----
const MUSIC_SRC = "/audio/space-music.mp3"; // path inside Frontend/public/
const VOLUME = 0.15; // 0.0 (silent) to 1.0 (full). 0.15 = soft background level
const FADE_IN_MS = 2500; // gentle fade-in so the music doesn't start abruptly
const STORAGE_KEY = "jamt-music-muted";
// ---------------------------------

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveMuted(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  // Load saved mute choice after the page is in the browser
  useEffect(() => {
    setMuted(readMuted());
  }, []);

  // Smoothly raise the volume from 0 to VOLUME
  const fadeIn = (audio: HTMLAudioElement) => {
    if (fadeRef.current) window.clearInterval(fadeRef.current);
    audio.volume = 0;
    const steps = 25;
    const stepTime = FADE_IN_MS / steps;
    let i = 0;
    fadeRef.current = window.setInterval(() => {
      i += 1;
      audio.volume = Math.min(VOLUME, (VOLUME * i) / steps);
      if (i >= steps && fadeRef.current) {
        window.clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    }, stepTime);
  };

  // Start the music on the first user interaction anywhere on the page
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = VOLUME;

    const start = () => {
      if (readMuted()) return; // respect the saved "off" choice
      audio
        .play()
        .then(() => {
          setStarted(true);
          fadeIn(audio);
          removeListeners();
        })
        .catch(() => {
          /* still blocked — will try again on the next interaction */
        });
    };

    const events: (keyof DocumentEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    const removeListeners = () =>
      events.forEach((e) => document.removeEventListener(e, start));

    events.forEach((e) => document.addEventListener(e, start, { passive: true }));

    return () => {
      removeListeners();
      if (fadeRef.current) window.clearInterval(fadeRef.current);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    setMuted(next);
    saveMuted(next);

    if (next) {
      audio.pause();
    } else {
      audio
        .play()
        .then(() => {
          setStarted(true);
          fadeIn(audio);
        })
        .catch(() => {});
    }
  };

  const isPlaying = started && !muted;

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} preload="auto" loop />
      <button
        type="button"
        className="bg-music-toggle"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        aria-label={muted ? "Turn music on" : "Turn music off"}
        title={muted ? "Turn music on" : "Turn music off"}
      >
        <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
        <span className="bg-music-label">{isPlaying ? "Music on" : muted ? "Music off" : "Music"}</span>
      </button>
    </>
  );
}
