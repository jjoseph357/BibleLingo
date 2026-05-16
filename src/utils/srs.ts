// ============================================================
// Spaced Repetition System — Simplified Leitner
// ============================================================
//
// Rules:
//   - Correct → double the interval (min 1 day, max 30 days)
//   - Incorrect → reset interval to 0 (review again today)
//
// The function is pure: no side effects, no external state.
// ============================================================

import { UserProgress } from "../types/models";

const MAX_INTERVAL_DAYS = 30;

/**
 * Compute the next SRS state for a verse after a review.
 *
 * @param current  - The verse's current progress record.
 * @param correct  - Whether the user answered correctly.
 * @param now      - Optional "current time" for testability (defaults to Date.now()).
 * @returns          A new UserProgress with updated interval, review date, and rep count.
 */
export function computeNextReview(
  current: UserProgress,
  correct: boolean,
  now: Date = new Date()
): UserProgress {
  let nextInterval: number;

  if (correct) {
    // First correct answer → 1 day. After that, double the interval.
    nextInterval = current.intervalDays === 0 ? 1 : current.intervalDays * 2;
    nextInterval = Math.min(nextInterval, MAX_INTERVAL_DAYS);
  } else {
    // Forgot → reset to 0 (due today).
    nextInterval = 0;
  }

  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + nextInterval);

  return {
    verseReference: current.verseReference,
    intervalDays: nextInterval,
    nextReviewDate: nextDate.toISOString(),
    repetitions: current.repetitions + 1,
  };
}
