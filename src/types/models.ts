// ============================================================
// Core Data Models for BibleLingo
// ============================================================

export type Difficulty = "Easy" | "Medium" | "Hard";

/** A single verse card sourced from the content JSON. */
export interface VerseItem {
  lessonId: string;
  bookPath: string;           // e.g. "The Economy of God"
  unitTitle: string;          // e.g. "The Triune God"
  chapterTitle?: string;      // e.g. "CHAPTER ONE: THE MYSTERY OF HUMAN LIFE"
  verseReference: string;     // e.g. "2 Cor. 13:14"
  verseText?: string;         // Populated in-memory from LSM API (not stored locally)
  themeTags: string[];        // e.g. ["Triune God", "Dispensing"]
  difficulty: Difficulty;
  decoyWords: string[];       // Wrong-answer options for quizzes
}

/** SRS tracking data for a single verse. */
export interface UserProgress {
  verseReference: string;     // Links back to VerseItem
  intervalDays: number;       // Current interval in days (0 = new/reset)
  nextReviewDate: string;     // ISO 8601 date string
  repetitions: number;        // Total times reviewed
}

/** Top-level user profile. */
export interface UserProfile {
  id: string;
  displayName: string;
  createdAt: string;          // ISO 8601
  progress: UserProgress[];   // One entry per studied verse
}
