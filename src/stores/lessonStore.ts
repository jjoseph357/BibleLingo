// ============================================================
// Lesson Engine — Zustand Store
// ============================================================
//
// Manages the state of a single lesson session:
//   - Async loading of verse text from LSM API
//   - Tracks position in the verse array
//   - Tracks score and lives (3 to start)
//   - Ends the lesson when lives hit 0 OR all verses are answered
// ============================================================

import { createStore } from "zustand/vanilla";
import { VerseItem } from "../types/models";
import { fetchLessonVerses } from "../services/bibleApi";

export interface LessonState {
  verses: VerseItem[];
  currentQuestionIndex: number;
  score: number;
  isLessonComplete: boolean;
  isLoading: boolean;
  offlineError: string | null;
  copyrightText: string;
  isReviewMode: boolean;
  lessonId: string | null;
  lastPlayedVerseReference: string | null;

  loadLesson: (verses: VerseItem[], isReview?: boolean, lessonId?: string | null) => Promise<void>;
  startLesson: (verses: VerseItem[]) => void;
  submitAnswer: (isCorrect: boolean, verseRef?: string | null) => void;
  nextQuestion: () => void;
  restartLesson: () => void;
  resetLessonState: () => void;
}

export const lessonStore = createStore<LessonState>((set, get) => ({
  verses: [],
  currentQuestionIndex: 0,
  score: 0,
  isLessonComplete: false,
  isLoading: false,
  offlineError: null,
  copyrightText: "",
  isReviewMode: false,
  lessonId: null,
  lastPlayedVerseReference: null,

  loadLesson: async (verses, isReview = false, lessonId = null) => {
    set({ isLoading: true, offlineError: null, copyrightText: "", isReviewMode: isReview, lessonId });

    try {
      const refs = verses.map((v) => v.verseReference);
      const { verses: textMap, copyright } = await fetchLessonVerses(refs);

      // Merge fetched text into VerseItem objects in-memory.
      const hydrated = verses.map((v) => ({
        ...v,
        verseText: textMap[v.verseReference] ?? "",
      }));

      set({
        verses: hydrated,
        currentQuestionIndex: 0,
        score: 0,
        isLessonComplete: false,
        isLoading: false,
        copyrightText: copyright,
        lessonId,
      });
    } catch (err) {
      set({
        isLoading: false,
        offlineError:
          err instanceof Error ? err.message : "Failed to load verses.",
      });
    }
  },

  startLesson: (verses) =>
    set({
      verses,
      currentQuestionIndex: 0,
      score: 0,
      isLessonComplete: false,
      isLoading: false,
      offlineError: null,
      copyrightText: "",
      lessonId: null,
      lastPlayedVerseReference: null,
    }),

  submitAnswer: (isCorrect, verseRef = null) => {
    const state = get();
    if (state.isLessonComplete) return;

    if (isCorrect) {
      set({ score: state.score + 1, lastPlayedVerseReference: verseRef });
    } else {
      set({ lastPlayedVerseReference: verseRef });
    }
  },

  nextQuestion: () => {
    const state = get();
    if (state.isLessonComplete) return;

    const nextIndex = state.currentQuestionIndex + 1;
    if (nextIndex >= state.verses.length) {
      set({ isLessonComplete: true });
    } else {
      set({ currentQuestionIndex: nextIndex });
    }
  },

  restartLesson: () =>
    set({
      currentQuestionIndex: 0,
      score: 0,
      isLessonComplete: false,
      offlineError: null,
      lastPlayedVerseReference: null,
    }),

  resetLessonState: () =>
    set({
      verses: [],
      currentQuestionIndex: 0,
      score: 0,
      isLessonComplete: false,
      isLoading: false,
      offlineError: null,
      copyrightText: "",
      isReviewMode: false,
      lessonId: null,
      lastPlayedVerseReference: null,
    }),
}));
