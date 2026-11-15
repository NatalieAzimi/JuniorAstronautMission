# How to write story events

Story events live in JSON files in this folder (`Frontend/lib/game/data/`).
An event is a message that pops up in the morning, with 2 or 3 choices for the player.
The file is a list: it starts with `[`, ends with `]`, and has commas between events.

## Copy this example

```json
[
  {
    "id": "mars_dust_storm_warning",
    "speaker": "Mission Control",
    "chance": 0.3,
    "onlyIf": { "world": "mars", "minSol": 2, "missingFlag": "dustStorm" },
    "text": "Our orbiter sees a dust storm coming. Dust blocks sunlight, so the solar panels will make less power.",
    "choices": [
      {
        "label": "Charge the batteries now (1 h)",
        "minutes": 60,
        "effects": { "power": 10 },
        "flag": "dustStorm",
        "result": "The batteries are full. Let the storm come!"
      },
      {
        "label": "Keep working on the experiment",
        "effects": { "research": 1, "power": -5 },
        "flag": "dustStorm",
        "result": "You got more science done, but the batteries are lower."
      }
    ],
    "fact": {
      "text": "In 2018, a dust storm covered all of Mars. It blocked so much sunlight that NASA's Opportunity rover ran out of power.",
      "source": "NASA"
    }
  }
]
```

## Event fields

| Field | Needed? | What it does |
|---|---|---|
| `id` | yes | Unique name, lowercase_with_underscores. Don't rename it once other events point to it. |
| `text` | yes | What the narrator or crew says. Keep it under 300 characters. |
| `choices` | yes | 2 or 3 choices (see below). |
| `speaker` | no | Who is talking: "Narrator", "Engineer", "Mission Control"... |
| `chance` | no | Chance each morning, from 0 to 1. `0.3` = 30%. `1` = always (use with `minSol`/`maxSol` to pick the sol). Leave it out if the event should only happen through a choice's `next`. |
| `onlyIf` | no | When the event is allowed (see below). |
| `fact` | no | A real fact card: `text` and `source` are both needed, `url` is optional. |

## Choice fields

| Field | Needed? | What it does |
|---|---|---|
| `label` | yes | The button text. Put the time in it, like "Repair it (2 h)". |
| `minutes` | no | Crew time it takes. The crew has 480 minutes (8 hours) of work per sol. |
| `effects` | no | Meter changes: `oxygen`, `food`, `power`, `shielding`, `research`. Negative numbers go down. |
| `result` | no | What the narrator says after the choice. |
| `next` | no | The `id` of an event that starts right after this choice (for branching). |
| `flag` | no | `"dustStorm"` turns a flag on, `"!dustStorm"` turns it off. |

## onlyIf fields

| Field | Example | Meaning |
|---|---|---|
| `world` | `"mars"` or `"moon"` | Only on that world. Leave it out for both. |
| `minSol` / `maxSol` | `2` / `4` | Only from sol 2 to sol 4. |
| `hasFlag` | `"dustStorm"` | Only while that flag is on. |
| `missingFlag` | `"dustStorm"` | Only while that flag is off. |
| `below` | `{ "power": 30 }` | Only when power is under 30. |

## Numbers that feel right (game values, not real NASA numbers)

- Meters go from 0 to 100. Start: oxygen 80, food 70, power 80, shielding 60.
- If oxygen, food or shielding reaches 0, the crew is evacuated.
- Small change 3–5, medium 8–12, big 15–20.
- Most choices take 30–180 minutes.
- The mission is 5 sols. The research goal is 10.

## Rules

1. **Every choice costs something**: time (`minutes`) or a meter going down. Even "do nothing" costs something.
2. **Losing is not a punishment.** Say "evacuation", never death. The game already offers "try again from yesterday".
3. **Real facts need a source.** Put them in `fact`. Don't make up NASA facts, and don't present game numbers as real.
4. **Write for kids**: short sentences, simple words.
5. **One event per morning.** If several could happen, the one higher in the file is tried first.
6. **Each event happens at most once per game.**
7. Events appear in the morning, so don't use `timeOfDay` for now.
8. The Moon world isn't built yet, but you can already write `"world": "moon"` events.

## Branching example

```json
{ "label": "Quick patch (30 min)", "minutes": 30, "effects": { "oxygen": -10 }, "next": "patch_leaks" }
```

Then write an event with `"id": "patch_leaks"` and **no** `chance`, so it only happens after that choice.

## Flags

`dustStorm` is special: while it's on, the solar panels make less power. Any other flag name
(like `"alarmFixed"`) is just a note the story uses with `hasFlag` / `missingFlag`.

## Check your file

From the `Frontend` folder:

```
npx tsx lib/game/check-story.ts lib/game/data/your-file.json
```

Common JSON mistakes:
- a comma after the last item in a list
- a missing comma between items
- curly quotes (“ ”) from Google Docs or Word: JSON needs straight quotes (" ")
- comments: JSON doesn't allow them