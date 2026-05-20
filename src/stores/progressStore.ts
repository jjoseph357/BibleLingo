// ============================================================
// Progress Store — SRS Review Data & User Stats
// ============================================================

import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProgress } from "../types/models";

export interface LessonSession {
  status: "in_progress" | "completed";
  verseStepIndex?: Record<string, number>;
  verseMastery?: Record<
    string,
    {
      level: number;
      completedModes: string[];
    }
  >;
  progressPercentage: number;
}export interface ProgressState {
  entries: UserProgress[];
  xp: number;
  streakDays: number;
  lastPracticeDate: string | null;
  achievements: string[];
  perfectScribes: number;
  toastMessage: string | null;
  completedLessons?: string[];
  lessonSessions: Record<string, LessonSession>;
  earlyMorningsCount: number;
  username: string | null;

  addOrUpdate: (entry: UserProgress) => void;
  addXp: (amount: number) => void;
  updateStreak: () => void;
  fastForward: (days: number) => void;
  reset: () => void;
  unlockAchievement: (id: string) => void;
  incrementPerfectScribes: () => void;
  incrementEarlyMorningsCount: () => void;
  setUsername: (name: string | null) => void;
  showToast: (message: string) => void;
  saveLessonSession: (
    lessonId: string,
    session: Omit<LessonSession, "status"> & { status?: "in_progress" | "completed" }
  ) => void;
  completeLessonSession: (lessonId: string) => void;
}

export const progressStore = createStore<ProgressState>()(
  persist(
    (set, get) => ({
      entries: [],
      xp: 0,
      streakDays: 0,
      lastPracticeDate: null,
      achievements: [],
      perfectScribes: 0,
      toastMessage: null,
      completedLessons: [],
      lessonSessions: {},
      earlyMorningsCount: 0,
      username: null,

      addOrUpdate: (entry) =>
        set((state) => {
          const idx = state.entries.findIndex(
            (e) => e.verseReference === entry.verseReference
          );
          const next = [...state.entries];
          if (idx >= 0) {
            next[idx] = entry;
          } else {
            next.push(entry);
          }
          return { entries: next };
        }),

      addXp: (amount) => set((state) => ({ xp: state.xp + amount })),

      updateStreak: () => {
        const state = get();
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        
        if (state.lastPracticeDate === today) {
          return; // Already practiced today
        }

        let newStreak = state.streakDays + 1;
        
        if (state.lastPracticeDate) {
          const [lastY, lastM, lastD] = state.lastPracticeDate.split("-").map(Number);
          const [currY, currM, currD] = today.split("-").map(Number);
          
          const lastDateUTC = Date.UTC(lastY, lastM - 1, lastD);
          const currentDateUTC = Date.UTC(currY, currM - 1, currD);
          
          const diffTime = Math.abs(currentDateUTC - lastDateUTC);
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 1) {
            newStreak = 1; // Streak broken
          }
        }

        const hour = now.getHours();
        const newEarlyMornings = (hour >= 5 && hour < 7) 
          ? state.earlyMorningsCount + 1 
          : state.earlyMorningsCount;

        set({ 
          streakDays: newStreak, 
          lastPracticeDate: today,
          earlyMorningsCount: newEarlyMornings
        });
      },

      fastForward: (days) =>
        set((state) => ({
          entries: state.entries.map((e) => {
            const date = new Date(e.nextReviewDate);
            date.setDate(date.getDate() - days);
            return { ...e, nextReviewDate: date.toISOString() };
          }),
        })),

      reset: () =>
        set({
          entries: [],
          xp: 0,
          streakDays: 0,
          lastPracticeDate: null,
          achievements: [],
          perfectScribes: 0,
          toastMessage: null,
          completedLessons: [],
          lessonSessions: {},
          earlyMorningsCount: 0,
          username: null,
        }),
      unlockAchievement: (id) =>
        set((state) => ({
          achievements: state.achievements.includes(id)
            ? state.achievements
            : [...state.achievements, id],
        })),
      incrementPerfectScribes: () =>
        set((state) => ({ perfectScribes: state.perfectScribes + 1 })),
      incrementEarlyMorningsCount: () =>
        set((state) => ({ earlyMorningsCount: state.earlyMorningsCount + 1 })),
      setUsername: (name) => set({ username: name }),
      showToast: (message) => {
        set({ toastMessage: message });
        setTimeout(() => {
          if (get().toastMessage === message) {
            set({ toastMessage: null });
          }
        }, 3000);
      },
      saveLessonSession: (lessonId, session) =>
        set((state) => {
          const current = state.lessonSessions[lessonId];
          const status = session.status || (current ? current.status : "in_progress");
          return {
            lessonSessions: {
              ...state.lessonSessions,
              [lessonId]: {
                status,
                verseMastery: session.verseMastery,
                verseStepIndex: session.verseStepIndex,
                progressPercentage: session.progressPercentage,
              },
            },
          };
        }),
      completeLessonSession: (lessonId) =>
        set((state) => {
          const current = state.lessonSessions[lessonId] || {
            verseMastery: {},
            verseStepIndex: {},
            progressPercentage: 1.0,
          };
          return {
            lessonSessions: {
              ...state.lessonSessions,
              [lessonId]: {
                ...current,
                status: "completed",
                progressPercentage: 1.0,
              },
            },
          };
        }),
    }),
    {
      name: "biblelingo-progress-storage",
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        if (persistedState && Array.isArray(persistedState.completedLessons)) {
          const lessonSessions = persistedState.lessonSessions || {};
          for (const id of persistedState.completedLessons) {
            if (!lessonSessions[id]) {
              lessonSessions[id] = {
                status: "completed",
                verseMastery: {},
                verseStepIndex: {},
                progressPercentage: 1.0,
              };
            }
          }
          return {
            ...persistedState,
            lessonSessions,
          };
        }
        return persistedState;
      },
    }
  )
);
