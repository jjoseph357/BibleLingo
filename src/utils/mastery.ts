// ============================================================
// Mastery Track Scaffolding Utility
// ============================================================

export interface MasteryStep {
  mode: "NAVIGATOR_EASY" | "NAVIGATOR_HARD" | "MISSING_LINK" | "TYPE_BLANK" | "SCRAMBLE" | "SCRIBE";
  missingCount: number;
}

/**
 * Counts words by stripping out punctuation/whitespace and splitting.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Dynamically scaffolds a sequence of practice steps based on verse word count.
 * All lengths strictly adhere to the following sequence rules:
 * 1. NAVIGATOR_EASY is always the very first quiz step (pure recognition).
 * 2. All MISSING_LINK steps occur in the first half of the track.
 * 3. NAVIGATOR_HARD is placed at the transition from MISSING_LINK to TYPE_BLANK.
 * 4. SCRAMBLE steps only appear in the second half.
 * 5. SCRIBE is always the final step.
 * 6. The missingCount scales up as the track progresses.
 */
export function generateMasteryTrack(verseText: string): MasteryStep[] {
  const wordCount = countWords(verseText);

  if (wordCount < 15) {
    // SHORT (< 15 words): 7 steps
    return [
      { mode: "NAVIGATOR_EASY", missingCount: 0 },
      { mode: "MISSING_LINK", missingCount: 1 },
      { mode: "MISSING_LINK", missingCount: 2 },
      { mode: "NAVIGATOR_HARD", missingCount: 0 },
      { mode: "TYPE_BLANK", missingCount: 2 },
      { mode: "SCRAMBLE", missingCount: 0 },
      { mode: "SCRIBE", missingCount: 0 },
    ];
  } else if (wordCount <= 30) {
    // MEDIUM (15 - 30 words): 10 steps
    return [
      { mode: "NAVIGATOR_EASY", missingCount: 0 },
      { mode: "MISSING_LINK", missingCount: 1 },
      { mode: "MISSING_LINK", missingCount: 2 },
      { mode: "MISSING_LINK", missingCount: 3 },
      { mode: "NAVIGATOR_HARD", missingCount: 0 },
      { mode: "TYPE_BLANK", missingCount: 3 },
      { mode: "SCRAMBLE", missingCount: 0 },
      { mode: "TYPE_BLANK", missingCount: 4 },
      { mode: "SCRAMBLE", missingCount: 0 },
      { mode: "NAVIGATOR_HARD", missingCount: 0 },
      { mode: "SCRIBE", missingCount: 0 },
    ];
  } else {
    // LONG (> 30 words): 12 steps
    return [
      { mode: "NAVIGATOR_EASY", missingCount: 0 },
      { mode: "MISSING_LINK", missingCount: 1 },
      { mode: "MISSING_LINK", missingCount: 2 },
      { mode: "MISSING_LINK", missingCount: 3 },
      { mode: "MISSING_LINK", missingCount: 4 },
      { mode: "NAVIGATOR_HARD", missingCount: 0 },
      { mode: "TYPE_BLANK", missingCount: 4 },
      { mode: "SCRAMBLE", missingCount: 0 },
      { mode: "TYPE_BLANK", missingCount: 5 },
      { mode: "SCRAMBLE", missingCount: 0 },
      { mode: "TYPE_BLANK", missingCount: 6 },
      { mode: "NAVIGATOR_HARD", missingCount: 0 },
      { mode: "SCRIBE", missingCount: 0 },
    ];
  }
}
