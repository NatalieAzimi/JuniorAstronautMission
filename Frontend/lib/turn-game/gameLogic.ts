export type Dest = "moon" | "mars";
export type Action = "greenhouse" | "conserve" | "recycle"| "comms"| "solar array";

export const config = {
  moon: {
    name: "Moon",
    dayTurns: 4,
    nightTurns: 4,
    totalTurns: 24,
    solar: 30,
    note: "On the real Moon, day and night each last about 14 Earth days. To perserve the mental health of our astronauts we have an artifical day night cycle.",
  },
  mars: {
    name: "Mars",
    dayTurns: 1,
    nightTurns: 1,
    totalTurns: 20,
    solar: 22,
    note: "A Mars day (a sol) lasts about 24.6 hours. Each turn here is half a sol: one daytime, one night.",
  },
} as const;

export type GameState = {
  turn: number;
  power: number;
  oxygen: number;
  food: number;
  status: "playing" | "won" | "lost";
  log: string;
  lossReason?: string;
};

export const startState = (): GameState => ({
  turn: 1,
  power: 70,
  oxygen: 80,
  food: 70,
  status: "playing",
  log: "",
});

export function isDay(dest: Dest, turn: number): boolean {
  const c = config[dest];
  const cycle = c.dayTurns + c.nightTurns;
  return (turn - 1) % cycle < c.dayTurns;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function nextTurn(dest: Dest, s: GameState, action: Action): GameState {
  if (s.status !== "playing") return s;

  const c = config[dest];
  const day = isDay(dest, s.turn);
  const notes: string[] = [];

  // Every turn the crew uses power, air, and food
  let power = s.power - 8;
  let oxygen = s.oxygen - 6;
  let food = s.food - 6;

  if (day) {
    power += c.solar;
    notes.push(`Solar panels made +${c.solar} power.`);
  } else {
    notes.push("Night: the solar panels made no power.");
  }

  if (action === "greenhouse") {
    power -= 12;
    food += 10;
    oxygen += 6;
    notes.push("The greenhouse grew food and oxygen, but used power.");
  } else if (action === "conserve") {
    power += 4;
    notes.push("You saved power by shutting down extra systems.");
  } else if (action === "comms") { //fix comms and solar array later
    power += 4;
    notes.push("You called comms.");
  } else if (action === "solar array") {
    power += 4; 
    notes.push("You cleaned the solar panels.");
  } else {
    power -= 10;
    oxygen += 14;
    notes.push("Air recycler boosted oxygen, but used power.");
  }

  let blackout = false;
  if (power <= 0) {
    power = 0;
    oxygen -= 10;
    blackout = true;
    notes.push("BLACKOUT! Life support lost power and oxygen is dropping fast.");
  }

  power = clamp(power);
  oxygen = clamp(oxygen);
  food = clamp(food);

  const base: GameState = {
    ...s,
    power,
    oxygen,
    food,
    turn: s.turn + 1,
    log: notes.join(" "),
  };

  if (oxygen <= 0) {
    const why = blackout
      ? day
        ? "The batteries ran out of power, so life support shut down."
        : "The batteries ran dry during the night, when solar panels make no power, so life support shut down."
      : "You used oxygen faster than the air recycler and greenhouse could replace it.";
    return { ...base, status: "lost", lossReason: `You ran out of oxygen. ${why}` };
  }
  if (food <= 0) {
    return {
      ...base,
      status: "lost",
      lossReason: "You ran out of food. The greenhouse wasn't run often enough.",
    };
  }
  if (s.turn >= c.totalTurns) {
    return { ...base, status: "won" };
  }
  return base;
}