# Future plan

Chronostra reads the `future-data` block below. Edit here or in the Chronostra view (Settings → Target file: `Future plan.md`).

This sample follows one small story:

- A long-term Wish: travel every prefecture in Japan.
- A concrete Must: plan and take the Amami Oshima trip.
- A standalone Step: keep a daily stretching habit.

The important part is the shape: wishes can be captured quickly, but categories keep them in perspective. Money, work, health, family, learning, and travel can all exist in the same plan without letting one area quietly crowd out the others.

Each row stays human-readable Markdown data in one block, while Chronostra turns it into a layered timeline. Link out to separate notes only when a goal needs more context.

```future-data
[
  {
    "id": "1",
    "path": ["Health", "Travel every prefecture in Japan"],
    "scope": "vision",
    "commitment": "wish",
    "metrics": { "future": "47/47 visited", "now": "12/47", "gap": "35 to go" },
    "timeline": [{ "year": 2050, "text": "Final prefecture" }]
  },
  {
    "id": "2",
    "path": ["Health", "Travel every prefecture in Japan", "Visit Amami Ōshima"],
    "scope": "step",
    "commitment": "must",
    "metrics": { "future": "Booked & visited", "now": "Researching", "gap": "Plan trip" },
    "timeline": [{ "year": 2027, "text": "Ferry from Kagoshima" }]
  },
  {
    "id": "3",
    "path": ["Health", "Stretch every morning"],
    "scope": "step",
    "metrics": { "future": "Daily habit", "now": "3x/week", "gap": "Consistency" },
    "timeline": []
  }
]
```
