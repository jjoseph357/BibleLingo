// ============================================================
// Progress Store — SRS Review Data & User Stats
// ============================================================

import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProgress } from "../types/models";
import { db, isFirebaseConfigured } from "../services/firebase";
import { doc, updateDoc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";

function getStartOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d.toISOString();
}

export function getLocalTodayString(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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
}

export interface DailyQuests {
  readQuote: boolean;
  clearedQueue: boolean;
  studiedNew: boolean;
  chestClaimed: boolean;
}

export interface ProgressState {
  entries: UserProgress[];
  xp: number;
  weeklyXp: number;
  lastWeekSync: string | null;
  streakDays: number;
  lastPracticeDate: string | null;
  achievements: string[];
  perfectScribes: number;
  toastMessage: string | null;
  completedLessons?: string[];
  lessonSessions: Record<string, LessonSession>;
  earlyMorningsCount: number;
  username: string | null;

  // Virtual Economy & Gamification
  crowns: number;
  streakFreezes: number;
  nodeSkin: string;
  leagueTier: string;
  dailyQuests: DailyQuests;
  lastQuestDate: string | null;
  xpBoostEndTime: string | null;

  // High-Five Social
  pendingHighFives: { from: string; timestamp: string }[];
  highFiveCrownsToday: number;
  lastHighFiveDate: string | null;

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
  syncToCloud: () => Promise<void>;

  // Economy Actions
  addCrowns: (amount: number) => void;
  buyStreakFreeze: () => void;
  buyNodeSkin: (skinId: string) => void;
  updateDailyQuest: (quest: keyof DailyQuests) => void;
  claimDailyChest: () => void;
  activateXpBoost: () => void;
  fetchHighFives: () => Promise<void>;
  clearPendingHighFives: () => void;
  addHighFiveCrown: () => boolean;
}

const DEFAULT_QUESTS: DailyQuests = {
  readQuote: false,
  clearedQueue: false,
  studiedNew: false,
  chestClaimed: false,
};

export const progressStore = createStore<ProgressState>()(
  persist(
    (set, get) => ({
      entries: [],
      xp: 0,
      weeklyXp: 0,
      lastWeekSync: null,
      streakDays: 0,
      lastPracticeDate: null,
      achievements: [],
      perfectScribes: 0,
      toastMessage: null,
      completedLessons: [],
      lessonSessions: {},
      earlyMorningsCount: 0,
      username: null,
      
      crowns: 0,
      streakFreezes: 0,
      nodeSkin: 'default',
      leagueTier: 'Bronze',
      dailyQuests: DEFAULT_QUESTS,
      lastQuestDate: null,
      xpBoostEndTime: null,

      pendingHighFives: [],
      highFiveCrownsToday: 0,
      lastHighFiveDate: null,

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

      addXp: (amount) => set((state) => {
        const currentWeekStart = getStartOfWeek(new Date());
        let newWeeklyXp = state.weeklyXp;
        let newLastWeekSync = state.lastWeekSync;

        // Apply Double XP Boost if active
        let finalAmount = amount;
        if (state.xpBoostEndTime && new Date() < new Date(state.xpBoostEndTime)) {
          finalAmount = amount * 2;
        }

        if (state.lastWeekSync !== currentWeekStart) {
          newWeeklyXp = finalAmount;
          newLastWeekSync = currentWeekStart;
        } else {
          newWeeklyXp += finalAmount;
        }

        return { 
          xp: state.xp + finalAmount,
          weeklyXp: newWeeklyXp,
          lastWeekSync: newLastWeekSync
        };
      }),

      updateStreak: () => {
        const state = get();
        const now = new Date();
        const today = getLocalTodayString(now);
        
        let newStreak = state.streakDays;
        let newFreezes = state.streakFreezes;
        
        // Reset quests if it's a new day, regardless of practice
        let newQuests = state.dailyQuests;
        if (state.lastQuestDate !== today) {
          newQuests = DEFAULT_QUESTS;
        }

        if (state.lastPracticeDate !== today) {
          newStreak = state.streakDays + 1;
          
          if (state.lastPracticeDate) {
            const [lastY, lastM, lastD] = state.lastPracticeDate.split("-").map(Number);
            const [currY, currM, currD] = today.split("-").map(Number);
            
            const lastDateUTC = Date.UTC(lastY, lastM - 1, lastD);
            const currentDateUTC = Date.UTC(currY, currM - 1, currD);
            const diffDays = Math.round(Math.abs(currentDateUTC - lastDateUTC) / (1000 * 60 * 60 * 24));
            
            if (diffDays > 1) {
              if (newFreezes > 0) {
                newFreezes -= 1; // Consume freeze, save the streak!
              } else {
                newStreak = 1; // Streak broken
              }
            }
          }
        }

        const hour = now.getHours();
        const newEarlyMornings = (hour >= 5 && hour < 7) 
          ? state.earlyMorningsCount + 1 
          : state.earlyMorningsCount;

        set({ 
          streakDays: newStreak, 
          streakFreezes: newFreezes,
          lastPracticeDate: today,
          earlyMorningsCount: newEarlyMornings,
          dailyQuests: newQuests,
          lastQuestDate: today
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
          weeklyXp: 0,
          lastWeekSync: null,
          streakDays: 0,
          lastPracticeDate: null,
          achievements: [],
          perfectScribes: 0,
          toastMessage: null,
          completedLessons: [],
          lessonSessions: {},
          earlyMorningsCount: 0,
          username: null,
          crowns: 0,
          streakFreezes: 0,
          nodeSkin: 'default',
          leagueTier: 'Bronze',
          dailyQuests: DEFAULT_QUESTS,
          lastQuestDate: null,
          xpBoostEndTime: null,
          pendingHighFives: [],
          highFiveCrownsToday: 0,
          lastHighFiveDate: null,
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
      
      syncToCloud: async () => {
        const state = get();
        if (!state.username) return;
        if (!isFirebaseConfigured || !db) return;
        try {
          const userRef = doc(db, 'users', state.username.toLowerCase());
          await setDoc(userRef, {
            username: state.username,
            xp: state.xp,
            weeklyXp: state.weeklyXp,
            streakDays: state.streakDays,
            crowns: state.crowns,
            streakFreezes: state.streakFreezes,
            nodeSkin: state.nodeSkin,
            leagueTier: state.leagueTier,
            lastActive: new Date().toISOString(),
          }, { merge: true });
        } catch (err) {
          console.error("Failed to sync progress to cloud:", err);
        }
      },

      // -- Economy & Quests --
      addCrowns: (amount) => set((state) => ({ crowns: state.crowns + amount })),
      
      buyStreakFreeze: () => set((state) => {
        if (state.crowns >= 50) {
          return { crowns: state.crowns - 50, streakFreezes: state.streakFreezes + 1 };
        }
        return state;
      }),

      buyNodeSkin: (skinId) => set((state) => {
        const costs: Record<string, number> = { 'obsidian': 150, 'gold': 500 };
        const cost = costs[skinId] || 0;
        if (state.crowns >= cost && state.nodeSkin !== skinId) {
          return { crowns: state.crowns - cost, nodeSkin: skinId };
        }
        return state;
      }),

      updateDailyQuest: (quest) => set((state) => {
        // Ensure quests are reset if date is mismatched before updating
        const today = getLocalTodayString();
        const quests = state.lastQuestDate === today ? { ...state.dailyQuests } : { ...DEFAULT_QUESTS };
        quests[quest] = true;
        return { dailyQuests: quests, lastQuestDate: today };
      }),

      claimDailyChest: () => set((state) => {
        if (!state.dailyQuests.chestClaimed) {
          return { 
            dailyQuests: { ...state.dailyQuests, chestClaimed: true },
            crowns: state.crowns + 25 
          };
        }
        return state;
      }),

      activateXpBoost: () => set(() => {
        const endTime = new Date();
        endTime.setMinutes(endTime.getMinutes() + 15);
        return { xpBoostEndTime: endTime.toISOString() };
      }),

      fetchHighFives: async () => {
        const state = get();
        if (!state.username || !isFirebaseConfigured || !db) return;
        try {
          const hfRef = collection(db, 'users', state.username.toLowerCase(), 'highFives');
          const q = query(hfRef, where('seen', '==', false));
          const snapshot = await getDocs(q);
          if (snapshot.empty) return;

          const items: { from: string; timestamp: string }[] = [];
          const batch = writeBatch(db);
          snapshot.forEach(d => {
            items.push({ from: d.data().from, timestamp: d.data().timestamp });
            batch.update(d.ref, { seen: true });
          });
          await batch.commit();
          set({ pendingHighFives: items });
        } catch (err) {
          console.error("Failed to fetch high-fives:", err);
        }
      },

      clearPendingHighFives: () => set({ pendingHighFives: [] }),

      addHighFiveCrown: () => {
        const state = get();
        const today = getLocalTodayString();
        let todayCount = state.highFiveCrownsToday;
        if (state.lastHighFiveDate !== today) {
          todayCount = 0;
        }
        if (todayCount >= 5) return false; // Daily cap reached
        set({
          crowns: state.crowns + 1,
          highFiveCrownsToday: todayCount + 1,
          lastHighFiveDate: today,
        });
        return true;
      },

    }),
    {
      name: "biblelingo-progress-storage",
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        // ... existing migration ...
        let state = persistedState;
        if (state && Array.isArray(state.completedLessons)) {
          const lessonSessions = state.lessonSessions || {};
          for (const id of state.completedLessons) {
            if (!lessonSessions[id]) {
              lessonSessions[id] = {
                status: "completed",
                verseMastery: {},
                verseStepIndex: {},
                progressPercentage: 1.0,
              };
            }
          }
          state = { ...state, lessonSessions };
        }
        
        // Gamification defaults
        if (state) {
          state.crowns = state.crowns ?? 0;
          state.streakFreezes = state.streakFreezes ?? 0;
          state.nodeSkin = state.nodeSkin ?? 'default';
          state.leagueTier = state.leagueTier ?? 'Bronze';
          state.dailyQuests = state.dailyQuests ?? DEFAULT_QUESTS;
        }

        return state;
      },
    }
  )
);
