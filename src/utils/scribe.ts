// ============================================================
// Scribe Mode — Forgiving Text Matching
// ============================================================
//
// Normalization steps (applied to both strings):
//   1. Lowercase
//   2. Replace hyphens/dashes with spaces (preserves word boundaries)
//   3. Strip all remaining non-alphanumeric, non-space characters
//   4. Collapse multiple spaces → single space
//   5. Trim
//
// After normalization, strict equality is required.
// Misspellings and missing/extra words will NOT match.
// ============================================================

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212-]/g, " ") // hyphens & dashes → space
    .replace(/[^a-z0-9\s]/g, "")              // strip remaining punctuation
    .replace(/\s+/g, " ")                      // collapse whitespace
    .trim();
}

/**
 * Check if the user's typed input matches the target verse,
 * ignoring case, punctuation, and extra whitespace.
 */
export function checkScribeAnswer(
  userInput: string,
  targetVerse: string
): boolean {
  return normalize(userInput) === normalize(targetVerse);
}
