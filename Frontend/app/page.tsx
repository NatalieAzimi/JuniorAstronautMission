"use client";

// app/page.tsx  (UPDATED)
// Screens: title → name → Houston call → game.
// NEW: downloads real NASA space weather (DONKI) and a sky photo (APOD)
//      while the player is on the title screen, and ESC opens Settings
//      on the title screen too.

import { useEffect, useState } from "react";
import type { Dest } from "@/lib/mission/config";
import { loadApod, loadSpaceWeather } from "@/lib/mission/nasaData";
import type { Apod, SpaceWeather } from "@/lib/mission/nasaData";
import HoustonCall from "@/components/briefing/HoustonCall";
import HomeHud from "@/components/home/HomeHud";
import GameScreen from "@/components/game/GameScreen";
import SettingsMenu from "@/components/menus/SettingsMenu";

export default function Home() {
  const [screen, setScreen] = useState<"title" | "name" | "call" | "game">("title");
  const [dest, setDest] = useState<Dest>("moon");
  const [name, setName] = useState("");
  const [run, setRun] = useState(0); // new number = brand-new mission
  const [weather, setWeather] = useState<SpaceWeather | null>(null);
  const [apod, setApod] = useState<Apod | null>(null);
  const [settings, setSettingsOpen] = useState(false);

  const cleanName = name.trim();

  useEffect(() => {
    loadSpaceWeather().then(setWeather);
    loadApod().then(setApod);
  }, []);

  // ESC = settings on the title / name screens (the game screen has its own menu)
  useEffect(() => {
    if (screen !== "title" && screen !== "name") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !settings) {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, settings]);

  function begin() {
    if (!cleanName) return;
    setRun((r) => r + 1);
    setScreen("call");
  }
  function retry() {
    setRun((r) => r + 1);
    setScreen("game");
  }
  function backToTitle() {
    setScreen("title");
  }

  if (screen === "title" || screen === "name") {
    return (
      <>
        <HomeHud
          screen={screen}
          dest={dest}
          setDest={setDest}
          name={name}
          setName={setName}
          weather={weather}
          onLaunch={() => setScreen("name")}
          onBegin={begin}
          onSettings={() => setSettingsOpen(true)}
        />
        {settings && <SettingsMenu onClose={() => setSettingsOpen(false)} />}
      </>
    );
  }

  // Houston call plays over the outpost, then the mission clock starts.
  // The game waits for the NASA data (at most ~6 s, then archived data is used).
  return (
    <>
      {!weather ? (
        <main className="og-wait">📡 Downloading space weather from NASA…</main>
      ) : (
      <GameScreen
        key={run}
        dest={dest}
        name={cleanName}
        weather={weather}
        apod={apod}
        paused={screen === "call"}
        onRetry={retry}
        onBack={backToTitle}
      />
      )}
      {screen === "call" && <HoustonCall name={cleanName} dest={dest} onDone={() => setScreen("game")} />}
    </>
  );
}
