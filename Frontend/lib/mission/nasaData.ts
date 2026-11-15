// =====================================================================
// lib/mission/nasaData.ts  (NEW)
// Real NASA data, fetched in the player's browser:
//   • DONKI  solar flares (last 30 days)  → the Day 2 and Day 5 storms
//   • APOD   a random real space photo    → Fact Book cover
// If a request fails we fall back to REAL archived records and label
// them "ARCHIVED". We never show made-up numbers as live.
// Set NEXT_PUBLIC_NASA_API_KEY in Frontend/.env.local for your own key
// (free at api.nasa.gov). Otherwise DEMO_KEY is used (30 requests/hour).
// =====================================================================

import { ARCHIVED_FLARES } from "./config";

const KEY = process.env.NEXT_PUBLIC_NASA_API_KEY || "DEMO_KEY";
const TIMEOUT_MS = 6000;

export type Flare = {
  classType: string; // e.g. "X5.8"
  peak: string; //       ISO time
  region: string; //     sunspot region
  note?: string;
  strengthX: number; //  strength in "X1" units (M5 = 0.5, X9 = 9)
  live: boolean;
};

export type SpaceWeather = {
  live: boolean;
  checked: string; //       when we looked
  counts: { X: number; M: number; C: number };
  storms: [Flare, Flare]; // [day 2 storm, day 5 storm]
};

export type Apod = {
  live: boolean;
  title: string;
  date: string;
  image?: string;
  credit?: string;
  link: string;
};

export function strengthOf(classType: string): number {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)/.exec(classType.trim().toUpperCase());
  if (!m) return 0.1;
  const mult = { A: 0.0001, B: 0.001, C: 0.01, M: 0.1, X: 1 }[m[1] as "A" | "B" | "C" | "M" | "X"];
  return mult * Number(m[2]);
}

async function getJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// Session cache so replays don't use up the DEMO_KEY limit
function cached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function store(key: string, v: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function pickArchived(rnd: () => number): [Flare, Flare] {
  const list = ARCHIVED_FLARES.map((f) => ({ ...f, strengthX: strengthOf(f.classType), live: false }));
  const a = list.splice(Math.floor(rnd() * list.length), 1)[0];
  const b = list[Math.floor(rnd() * list.length)];
  // Day 5 is "The Big Storm": use the stronger one
  return a.strengthX <= b.strengthX ? [a, b] : [b, a];
}

type DonkiFlare = { classType?: string; peakTime?: string; beginTime?: string; activeRegionNum?: number | null };

export async function loadSpaceWeather(rnd: () => number = Math.random): Promise<SpaceWeather> {
  const fallback = (): SpaceWeather => ({
    live: false,
    checked: new Date().toISOString(),
    counts: { X: 4, M: 27, C: 0 }, // REAL: AR 2673, Sept 2017 (archived record)
    storms: pickArchived(rnd),
  });
  if (typeof window === "undefined") return fallback();

  const hit = cached<{ flares: DonkiFlare[]; checked: string }>("jamt-donki");
  let flares: DonkiFlare[];
  let checked: string;
  if (hit) {
    flares = hit.flares;
    checked = hit.checked;
  } else {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 864e5);
      flares = await getJson<DonkiFlare[]>(
        `https://api.nasa.gov/DONKI/FLR?startDate=${ymd(start)}&endDate=${ymd(end)}&api_key=${KEY}`,
      );
      if (!Array.isArray(flares)) throw new Error("bad data");
      checked = new Date().toISOString();
      store("jamt-donki", { flares, checked });
    } catch {
      return fallback();
    }
  }

  const real = flares
    .filter((f) => f.classType)
    .map<Flare>((f) => ({
      classType: f.classType!,
      peak: f.peakTime || f.beginTime || "",
      region: f.activeRegionNum ? `AR ${f.activeRegionNum}` : "unnamed region",
      strengthX: strengthOf(f.classType!),
      live: true,
    }));
  const counts = { X: 0, M: 0, C: 0 };
  for (const f of real) {
    const c = f.classType[0] as "X" | "M" | "C";
    if (c in counts) counts[c]++;
  }
  if (real.length === 0) {
    // Quiet Sun! Use archived storms for the story but still report the live counts.
    return { live: true, checked, counts, storms: pickArchived(rnd) };
  }
  real.sort((a, b) => b.strengthX - a.strengthX);
  const big = real[0];
  // Day 2: a random other real flare from the month (or the same one if only one)
  const others = real.slice(1);
  const small = others.length ? others[Math.floor(rnd() * Math.min(others.length, 8))] : big;
  return { live: true, checked, counts, storms: [small, big] };
}

type ApodJson = {
  title?: string; date?: string; url?: string; hdurl?: string; media_type?: string;
  thumbnail_url?: string; copyright?: string;
};

export async function loadApod(): Promise<Apod> {
  const offline: Apod = {
    live: false,
    title: "Astronomy Picture of the Day (offline)",
    date: "",
    link: "https://apod.nasa.gov/apod/",
  };
  if (typeof window === "undefined") return offline;
  const hit = cached<Apod>("jamt-apod");
  if (hit) return hit;
  try {
    // count=1 returns one RANDOM real APOD, so every play gets a different sky
    const arr = await getJson<ApodJson[]>(`https://api.nasa.gov/planetary/apod?count=1&thumbs=true&api_key=${KEY}`);
    const a = arr[0];
    const image = a.media_type === "image" ? a.url : a.thumbnail_url;
    const out: Apod = {
      live: true,
      title: a.title || "Untitled",
      date: a.date || "",
      image,
      credit: a.copyright?.replace(/\s+/g, " ").trim() || "NASA",
      link: a.date ? `https://apod.nasa.gov/apod/ap${a.date.slice(2).replace(/-/g, "")}.html` : offline.link,
    };
    store("jamt-apod", out);
    return out;
  } catch {
    return offline;
  }
}

export function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
