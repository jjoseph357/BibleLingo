import { computeNextReview } from "../srs";
import { UserProgress } from "../../types/models";

/** Helper: create a fresh verse progress record. */
function makeProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    verseReference: "2 Corinthians 13:14",
    intervalDays: 0,
    nextReviewDate: new Date().toISOString(),
    repetitions: 0,
    ...overrides,
  };
}

const NOW = new Date("2026-05-16T12:00:00Z");

describe("computeNextReview", () => {
  test("correct answer on a new verse → interval becomes 1 day", () => {
    const current = makeProgress({ intervalDays: 0 });
    const result = computeNextReview(current, true, NOW);

    expect(result.intervalDays).toBe(1);
    expect(result.nextReviewDate).toBe(new Date("2026-05-17T12:00:00Z").toISOString());
    expect(result.repetitions).toBe(1);
  });

  test("correct answer doubles a non-zero interval", () => {
    const current = makeProgress({ intervalDays: 4, repetitions: 3 });
    const result = computeNextReview(current, true, NOW);

    expect(result.intervalDays).toBe(8);
    expect(result.nextReviewDate).toBe(new Date("2026-05-24T12:00:00Z").toISOString());
    expect(result.repetitions).toBe(4);
  });

  test("incorrect answer resets interval to 0 (due today)", () => {
    const current = makeProgress({ intervalDays: 8, repetitions: 5 });
    const result = computeNextReview(current, false, NOW);

    expect(result.intervalDays).toBe(0);
    expect(result.nextReviewDate).toBe(NOW.toISOString());
    expect(result.repetitions).toBe(6);
  });
});
