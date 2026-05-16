# BibleLingo — Developer & Content Guide

This guide covers how to add verse content, how the SRS algorithm works, and how to troubleshoot common content errors.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Adding or Modifying Verses](#adding-or-modifying-verses)
3. [Adding a Unit to the Path Screen](#adding-a-unit-to-the-path-screen)
4. [Spaced Repetition System (SRS)](#spaced-repetition-system-srs)
5. [Game Modes and How Content Feeds Them](#game-modes-and-how-content-feeds-them)
6. [Troubleshooting Content Errors](#troubleshooting-content-errors)

---

## Project Structure

```
src/
├── components/
│   ├── PathScreen.tsx          # Home screen with book-grouped unit nodes
│   └── ScrambleQuestion.tsx    # Scramble game mode component
├── data/
│   ├── mockUnits.ts            # Unit definitions for the Path screen
│   └── verses/                 # ⬅ Verse JSON files go here (one per book)
│       └── the-economy-of-god.json
├── stores/
│   └── lessonStore.ts          # Zustand store for lesson session state
├── types/
│   ├── models.ts               # VerseItem, UserProgress, UserProfile
│   └── unit.ts                 # UnitNode, UnitStatus
└── utils/
    ├── srs.ts                  # SRS algorithm (computeNextReview)
    ├── scribe.ts               # Scribe mode text matching
    └── scramble.ts             # Scramble mode word splitting & order checking
```

---

## Adding or Modifying Verses

### Step 1: Create (or open) the JSON file

Verse files live in `src/data/verses/` and are named after the book using kebab-case:

| Book Title                | Filename                          |
| ------------------------- | --------------------------------- |
| The Economy of God        | `the-economy-of-god.json`         |
| The Experience of Life    | `the-experience-of-life.json`     |
| Life-Study of Romans      | `life-study-of-romans.json`       |

### Step 2: Add verse entries

Each file contains a JSON array of `VerseItem` objects. Here is the exact schema with a full example:

```json
[
  {
    "bookPath": "Life-Study of Romans",
    "chapter": "The Gospel of God",
    "verseReference": "Romans 1:1",
    "verseText": "Paul, a slave of Christ Jesus, a called apostle, separated unto the gospel of God,",
    "themeTags": ["Gospel", "Apostleship"],
    "difficulty": "Medium",
    "decoyWords": ["angel", "prophet"]
  }
]
```

### Field reference

| Field            | Type       | Required | Description |
| ---------------- | ---------- | -------- | ----------- |
| `bookPath`       | `string`   | ✅       | Must exactly match the book name used in `mockUnits.ts`. This is how verses are grouped into units on the Path screen. |
| `chapter`        | `string`   | ✅       | Chapter or section title from the book (e.g., `"The Gospel of God"`). |
| `verseReference` | `string`   | ✅       | Standard Bible reference (e.g., `"Romans 1:1"`). Must be **unique** across all files — this is the key used by the SRS system. |
| `verseText`      | `string`   | ✅       | Full verse text from the Recovery Version. Include all punctuation as it appears in the source. |
| `themeTags`      | `string[]` | ✅       | One or more topic tags. Use consistent names across verses (e.g., always `"Triune God"`, not sometimes `"Triune-God"`). |
| `difficulty`     | `string`   | ✅       | One of: `"Easy"`, `"Medium"`, `"Hard"`. Case-sensitive. |
| `decoyWords`     | `string[]` | ✅       | Wrong-answer words for Scramble mode. Must be **real English words** that are plausible but do not appear in the `verseText`. Provide at least 2. |

### Step 3: Validate your entry

Run the test suite to catch structural issues:

```bash
npm test
```

### Example: Adding 3 verses from "Life-Study of Romans"

```json
[
  {
    "bookPath": "Life-Study of Romans",
    "chapter": "The Gospel of God",
    "verseReference": "Romans 1:1",
    "verseText": "Paul, a slave of Christ Jesus, a called apostle, separated unto the gospel of God,",
    "themeTags": ["Gospel", "Apostleship"],
    "difficulty": "Easy",
    "decoyWords": ["angel", "prophet"]
  },
  {
    "bookPath": "Life-Study of Romans",
    "chapter": "The Gospel of God",
    "verseReference": "Romans 1:3-4",
    "verseText": "Concerning His Son, who came out of the seed of David according to the flesh, who was designated the Son of God in power according to the Spirit of holiness out of the resurrection of the dead, Jesus Christ our Lord;",
    "themeTags": ["Son of God", "Resurrection"],
    "difficulty": "Hard",
    "decoyWords": ["creation", "angels", "law"]
  },
  {
    "bookPath": "Life-Study of Romans",
    "chapter": "Condemnation",
    "verseReference": "Romans 8:1",
    "verseText": "There is now then no condemnation to those who are in Christ Jesus.",
    "themeTags": ["No Condemnation", "In Christ"],
    "difficulty": "Easy",
    "decoyWords": ["judgment", "punishment"]
  }
]
```

---

## Adding a Unit to the Path Screen

Units are defined in `src/data/mockUnits.ts`. Each unit is a node on the Path screen.

### Step 1: Add the unit entry

```typescript
{
  id: "u6",                              // Unique ID (increment from last)
  title: "The Gospel of God",            // Display name on the path
  bookPath: "Life-Study of Romans",      // Must match bookPath in your verse JSON
  status: "locked",                      // "completed" | "current" | "locked"
}
```

### How units connect to verses

The link between the Path screen and verse content is the **`bookPath`** string:

```
mockUnits.ts                    verses/life-study-of-romans.json
─────────────                   ────────────────────────────────
bookPath: "Life-Study           bookPath: "Life-Study
  of Romans"  ──────────────►     of Romans"
```

These strings must match **exactly** (case-sensitive). If they don't match, the unit will appear on the path but have no verses to load.

---

## Spaced Repetition System (SRS)

The SRS is implemented in `src/utils/srs.ts` as a single pure function: `computeNextReview()`.

### Algorithm: Simplified Leitner System

The SRS uses two simple rules:

**Rule 1 — Correct answer:** Double the interval.
- If the verse is new (interval = 0), set interval to **1 day**.
- Otherwise, multiply the current interval by **2**.
- Cap at a maximum of **30 days**.

**Rule 2 — Incorrect answer:** Reset to **0 days** (review again today).

### Interval progression (all correct answers)

| Review # | Previous Interval | New Interval | Next Review    |
| -------- | ----------------- | ------------ | -------------- |
| 1st      | 0 (new verse)     | **1 day**    | Tomorrow       |
| 2nd      | 1 day             | **2 days**   | In 2 days      |
| 3rd      | 2 days            | **4 days**   | In 4 days      |
| 4th      | 4 days            | **8 days**   | In 8 days      |
| 5th      | 8 days            | **16 days**  | In 16 days     |
| 6th      | 16 days           | **30 days**  | In 30 days ⬅ cap |
| 7th+     | 30 days           | **30 days**  | In 30 days     |

### Incorrect answer at any point

| Scenario            | Previous Interval | New Interval | Next Review |
| ------------------- | ----------------- | ------------ | ----------- |
| Forgot after 8 days | 8 days            | **0 days**   | Today       |

The user restarts the doubling progression from 0 → 1 → 2 → 4 → ...

### How `nextReviewDate` is calculated

```
nextReviewDate = currentDate + intervalDays
```

The date is stored as an ISO 8601 string (e.g., `"2026-05-17T12:00:00.000Z"`). A verse is due for review when `new Date() >= new Date(nextReviewDate)`.

### SRS data model

Each verse's review state is tracked in a `UserProgress` record:

```typescript
interface UserProgress {
  verseReference: string;   // Links to VerseItem (e.g., "Romans 8:1")
  intervalDays: number;     // Current interval: 0, 1, 2, 4, 8, 16, or 30
  nextReviewDate: string;   // ISO 8601 date string
  repetitions: number;      // Total times this verse has been reviewed
}
```

---

## Game Modes and How Content Feeds Them

### Scramble Mode

Uses `verseText` and `decoyWords` from the `VerseItem`.

- The verse text is split into individual word tokens (punctuation stripped, hyphens become word separators).
- Decoy words are mixed into the word bank and shuffled.
- The user taps words in order to reconstruct the verse.

**Content implication:** Your `decoyWords` should be plausible alternatives. If a verse mentions "grace," a good decoy is "mercy." A bad decoy is "xylophone."

### Scribe Mode

Uses `verseText` from the `VerseItem`.

- The user types the full verse from memory.
- Matching ignores case, punctuation, and extra whitespace.
- Matching does **not** ignore misspellings or missing/extra words.

**Content implication:** The `verseText` you enter is the authoritative answer. Ensure it exactly matches the Recovery Version source text.

---

## Troubleshooting Content Errors

### "Unit appears on path but has no verses"

**Cause:** The `bookPath` in `mockUnits.ts` doesn't match the `bookPath` in your verse JSON.

**Fix:** Check for exact string match, including capitalization and spacing:

```
❌  "The economy of God"    (lowercase 'e')
✅  "The Economy of God"
```

### "Scramble mode shows weird word splits"

**Cause:** Hyphens in `verseText` are treated as word separators. The phrase `"life-giving"` becomes two words: `"life"` and `"giving"`.

**This is expected behavior.** Do not try to work around it — the same splitting is applied during answer checking, so it stays consistent.

### "Decoy word appears in the actual verse"

**Cause:** A word in `decoyWords` also exists in `verseText`. This makes the Scramble mode confusing because the "wrong" answer is actually a valid word.

**Fix:** Before adding decoys, check that none of them appear in the verse:

```
verseText:  "The grace of the Lord Jesus Christ..."
decoyWords: ["mercy", "power"]     ✅ (neither appears in verse)
decoyWords: ["grace", "power"]     ❌ ("grace" is in the verse!)
```

### "Duplicate verseReference across files"

**Cause:** Two entries in different JSON files use the same `verseReference` (e.g., both have `"Romans 8:1"`).

**Why it matters:** The SRS system uses `verseReference` as the unique key in `UserProgress`. Duplicates will cause one verse's review data to overwrite the other.

**Fix:** Each `verseReference` must be globally unique. If you need the same verse in two books, use a qualifier:

```
"Romans 8:1"                    ← first occurrence
"Romans 8:1 (Life-Study)"      ← second occurrence in a different book
```

### "Invalid difficulty value"

**Cause:** The `difficulty` field must be exactly one of `"Easy"`, `"Medium"`, or `"Hard"` (case-sensitive).

```
❌  "easy"
❌  "MEDIUM"
❌  "Intermediate"
✅  "Easy"
✅  "Medium"
✅  "Hard"
```
