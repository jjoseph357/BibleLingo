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

const INITIAL_LIVES = 3;

export interface LessonState {
  verses: VerseItem[];
  currentQuestionIndex: number;
  score: number;
  lives: number;
  isLessonComplete: boolean;
  isLoading: boolean;
  offlineError: string | null;
  copyrightText: string;

  loadLesson: (verses: VerseItem[]) => Promise<void>;
  startLesson: (verses: VerseItem[]) => void;
  submitAnswer: (isCorrect: boolean) => void;
  nextQuestion: () => void;
  restartLesson: () => void;
}

export const lessonStore = createStore<LessonState>((set, get) => ({
  verses: [],
  currentQuestionIndex: 0,
  score: 0,
  lives: INITIAL_LIVES,
  isLessonComplete: false,
  isLoading: false,
  offlineError: null,
  copyrightText: "",

  loadLesson: async (verses) => {
    set({ isLoading: true, offlineError: null, copyrightText: "" });

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
        lives: INITIAL_LIVES,
        isLessonComplete: false,
        isLoading: false,
        copyrightText: copyright,
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
      lives: INITIAL_LIVES,
      isLessonComplete: false,
      isLoading: false,
      offlineError: null,
      copyrightText: "",
    }),

  submitAnswer: (isCorrect) => {
    const state = get();
    if (state.isLessonComplete) return;

    if (isCorrect) {
      set({ score: state.score + 1 });
    } else {
      const newLives = state.lives - 1;
      set({ lives: newLives, isLessonComplete: newLives <= 0 });
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
      lives: INITIAL_LIVES,
      isLessonComplete: false,
      offlineError: null,
    }),
}));
