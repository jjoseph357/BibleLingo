// ============================================================
// Progress Store — SRS Review Data & User Stats
// ============================================================

import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProgress } from "../types/models";
import { db, isFirebaseConfigured, auth } from "../services/firebase";
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
  uid: string | null;
  username: string | null;

  // Virtual Economy & Gamification
  crowns: number;
  streakFreezes: number;
  nodeSkin: string;
  ownedSkins: string[];
  leagueTier: string;
  activeWeekStr: string | null;
  lastWeekStr: string | null;
  lastWeeklyXp: number;
  pendingPromotion: { from: string, to: string, status: 'promoted' | 'demoted' } | null;
  dailyQuests: DailyQuests;
  lastQuestDate: string | null;
  xpBoostEndTime: string | null;

  // High-Five Social
  pendingHighFives: { from: string; timestamp: string }[];
  highFiveCrownsToday: number;
  lastHighFiveDate: string | null;

  // New Achievement Tracking
  lifetimeCrowns: number;
  hasBoughtStreakFreeze: boolean;
  highFivesSent: number;
  devotedDiscipleCount: number;
  doublePortionLessonsCompleted: number;
  vigilantSentinelCount: number;

  addOrUpdate: (entry: UserProgress) => void;
  addXp: (amount: number) => void;
  evaluateDailyResets: () => void;
  updateStreak: () => void;
  fastForward: (days: number) => void;
  reset: () => void;
  unlockAchievement: (id: string) => void;
  incrementPerfectScribes: () => void;
  incrementEarlyMorningsCount: () => void;
  setUid: (uid: string | null) => void;
  setUsername: (name: string | null) => void;
  showToast: (message: string) => void;
  saveLessonSession: (
    lessonId: string,
    session: Omit<LessonSession, "status"> & { status?: "in_progress" | "completed" }
  ) => void;
  completeLessonSession: (lessonId: string) => void;
  syncToCloud: () => Promise<void>;
  restoreFromCloud: (data: Partial<ProgressState>) => void;

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
  
  // Custom Paths
  injectCustomVerses: (verses: { verseReference: string; verseText?: string }[]) => void;
  
  // League
  evaluateLeaguePromotion: (lastWeekStr: string, lastWeeklyXp: number) => Promise<void>;
  clearPendingPromotion: () => void;
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
      uid: null,
      username: null,
      
      crowns: 0,
      streakFreezes: 0,
      nodeSkin: 'default',
      ownedSkins: ['default'],
      leagueTier: 'Bronze',
      activeWeekStr: null,
      lastWeekStr: null,
      lastWeeklyXp: 0,
      pendingPromotion: null,
      dailyQuests: DEFAULT_QUESTS,
      lastQuestDate: null,
      xpBoostEndTime: null,

      pendingHighFives: [],
      highFiveCrownsToday: 0,
      lastHighFiveDate: null,

      lifetimeCrowns: 0,
      hasBoughtStreakFreeze: false,
      highFivesSent: 0,
      devotedDiscipleCount: 0,
      doublePortionLessonsCompleted: 0,
      vigilantSentinelCount: 0,

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

      injectCustomVerses: (verses) => set((state) => {
        const next = [...state.entries];
        let changed = false;
        const nowStr = new Date().toISOString();
        
        for (const v of verses) {
          const exists = next.some(e => e.verseReference === v.verseReference);
          if (!exists) {
            next.push({
              verseReference: v.verseReference,
              intervalDays: 0,
              easeFactor: 2.5,
              nextReviewDate: nowStr, // Due immediately
            });
            changed = true;
          }
        }
        return changed ? { entries: next } : {};
      }),
      
      evaluateLeaguePromotion: async (lastWeekStr: string, lastWeeklyXp: number) => {
        const state = get();
        if (!isFirebaseConfigured || !db || !state.username) return;

        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('leagueTier', '==', state.leagueTier));
          const snapshot = await getDocs(q);

          let myRank = 1;
          let totalPlayers = 0;

          snapshot.forEach((docSnap) => {
            totalPlayers++;
            const d = docSnap.data();
            
            // Reconstruct their old week score accurately
            let theirScore = 0;
            if (d.activeWeekStr === lastWeekStr) {
              theirScore = d.weeklyXp || 0;
            } else if (d.lastWeekStr === lastWeekStr) {
              theirScore = d.lastWeeklyXp || 0;
            }

            if (theirScore > lastWeeklyXp) {
              myRank++;
            }
          });

          // Determine promotion / demotion
          const zoneSize = totalPlayers >= 15 ? 5 : totalPlayers >= 6 ? 3 : 1;
          const LEAGUES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'];
          const MAX_ACTIVE_LEAGUE = 'Bronze'; // Restrict for initial launch
          const maxIdx = LEAGUES.indexOf(MAX_ACTIVE_LEAGUE);
          const currentIdx = LEAGUES.indexOf(state.leagueTier);
          
          if (myRank <= zoneSize) {
            // Promote
            if (currentIdx < maxIdx) {
              const newTier = LEAGUES[currentIdx + 1];
              set({ 
                leagueTier: newTier,
                pendingPromotion: { from: state.leagueTier, to: newTier, status: 'promoted' }
              });
              
              if (newTier === 'Silver') get().unlockAchievement('ascending_zion_1');
              if (newTier === 'Gold') get().unlockAchievement('ascending_zion_2');
              if (newTier === 'Platinum') get().unlockAchievement('ascending_zion_3');
              if (newTier === 'Diamond') get().unlockAchievement('ascending_zion_4');
              if (newTier === 'Master') get().unlockAchievement('ascending_zion_5');
            }
          } else if (myRank > totalPlayers - zoneSize) {
            // Demote
            if (currentIdx > 0) {
              const newTier = LEAGUES[currentIdx - 1];
              set({ 
                leagueTier: newTier,
                pendingPromotion: { from: state.leagueTier, to: newTier, status: 'demoted' }
              });
            }
          }
          
          // Sync changes
          get().syncToCloud();
          
        } catch (err) {
          console.error("Failed to evaluate league promotion", err);
        }
      },

      clearPendingPromotion: () => set({ pendingPromotion: null }),

      addXp: (amount) => {
        const state = get();
        const currentWeekStart = getStartOfWeek(new Date());
        let newWeeklyXp = state.weeklyXp;
        let newLastWeekSync = state.lastWeekSync;
        let newActiveWeekStr = state.activeWeekStr;
        let newLastWeekStr = state.lastWeekStr;
        let newLastWeeklyXp = state.lastWeeklyXp;

        // Apply Double XP Boost if active (only double positive gains, not penalties)
        let finalAmount = amount;
        if (amount > 0 && state.xpBoostEndTime && new Date() < new Date(state.xpBoostEndTime)) {
          finalAmount = amount * 2;
        }

        if (state.lastWeekSync !== currentWeekStart) {
          if (state.activeWeekStr) {
            newLastWeekStr = state.activeWeekStr;
            newLastWeeklyXp = state.weeklyXp;
            
            if (state.leagueTier) {
              get().evaluateLeaguePromotion(newLastWeekStr, newLastWeeklyXp);
            }
          }
          newWeeklyXp = finalAmount;
          newLastWeekSync = currentWeekStart;
          newActiveWeekStr = currentWeekStart;
        } else {
          newWeeklyXp += finalAmount;
          newActiveWeekStr = currentWeekStart || state.activeWeekStr;
        }

        set({ 
          xp: state.xp + finalAmount,
          weeklyXp: newWeeklyXp,
          lastWeekSync: newLastWeekSync,
          activeWeekStr: newActiveWeekStr,
          lastWeekStr: newLastWeekStr,
          lastWeeklyXp: newLastWeeklyXp
        });
      },

      evaluateDailyResets: () => {
        const state = get();
        const todayStr = getLocalTodayString();

        let newQuests = state.dailyQuests;
        let newLastQuestDate = state.lastQuestDate;
        if (!state.lastQuestDate || state.lastQuestDate < todayStr) {
          newQuests = DEFAULT_QUESTS;
          newLastQuestDate = todayStr;
        }

        let newStreak = state.streakDays;
        let newFreezes = state.streakFreezes;
        let newLastPracticeDate = state.lastPracticeDate;

        if (state.lastPracticeDate && state.lastPracticeDate < todayStr) {
          const [lastY, lastM, lastD] = state.lastPracticeDate.split("-").map(Number);
          const [currY, currM, currD] = todayStr.split("-").map(Number);
          
          const lastDateUTC = Date.UTC(lastY, lastM - 1, lastD);
          const currentDateUTC = Date.UTC(currY, currM - 1, currD);
          const diffDays = Math.round((currentDateUTC - lastDateUTC) / (1000 * 60 * 60 * 24));
          
          if (diffDays > 1) {
            let daysMissed = diffDays - 1;
            while (daysMissed > 0) {
              if (newFreezes > 0) {
                newFreezes -= 1;
              } else {
                newStreak = 0; // Break
                break;
              }
              daysMissed -= 1;
            }
            
            if (newStreak > 0 && newFreezes !== state.streakFreezes) {
               // Survived via freezes! Fast forward lastPracticeDate to yesterday to cover the missed days
               const d = new Date();
               d.setDate(d.getDate() - 1);
               const yy = d.getFullYear();
               const mm = String(d.getMonth() + 1).padStart(2, "0");
               const dd = String(d.getDate()).padStart(2, "0");
               newLastPracticeDate = `${yy}-${mm}-${dd}`;
            } else if (newStreak === 0) {
               // Streak broken. We don't advance lastPracticeDate so the next practice starts at 1
            }
          }
        }
        
        if (newStreak !== state.streakDays || 
            newFreezes !== state.streakFreezes || 
            newLastPracticeDate !== state.lastPracticeDate ||
            newLastQuestDate !== state.lastQuestDate) {
          set({ 
            streakDays: newStreak, 
            streakFreezes: newFreezes, 
            lastPracticeDate: newLastPracticeDate,
            dailyQuests: newQuests,
            lastQuestDate: newLastQuestDate
          });
        }
      },

      updateStreak: () => {
        get().evaluateDailyResets();
        
        const state = get();
        const now = new Date();
        const today = getLocalTodayString(now);
        
        let newStreak = state.streakDays;
        
        if (!state.lastPracticeDate || state.lastPracticeDate < today) {
          newStreak = (state.streakDays === 0) ? 1 : state.streakDays + 1;
        }

        const hour = now.getHours();
        const newEarlyMornings = (hour >= 5 && hour < 7) 
          ? state.earlyMorningsCount + 1 
          : state.earlyMorningsCount;

        set({ 
          streakDays: newStreak, 
          lastPracticeDate: today,
          earlyMorningsCount: newEarlyMornings,
          lastQuestDate: today
        });
      },

      fastForward: (days) => {
        set((state) => {
          const shiftDateString = (dateStr: string | null) => {
            if (!dateStr) return null;
            const [y, m, d] = dateStr.split("-").map(Number);
            const date = new Date(y, m - 1, d);
            date.setDate(date.getDate() - days);
            const yy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            return `${yy}-${mm}-${dd}`;
          };

          return {
            lastPracticeDate: shiftDateString(state.lastPracticeDate),
            lastQuestDate: shiftDateString(state.lastQuestDate),
            lastHighFiveDate: shiftDateString(state.lastHighFiveDate),
            entries: state.entries.map((e) => {
              const date = new Date(e.nextReviewDate);
              date.setDate(date.getDate() - days);
              return { ...e, nextReviewDate: date.toISOString() };
            }),
          };
        });
        get().evaluateDailyResets();
      },

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
          uid: null,
          username: null,
          crowns: 0,
          streakFreezes: 0,
          nodeSkin: 'default',
          ownedSkins: ['default'],
          leagueTier: 'Bronze',
          dailyQuests: DEFAULT_QUESTS,
          lastQuestDate: null,
          xpBoostEndTime: null,
          pendingHighFives: [],
          highFiveCrownsToday: 0,
          lastHighFiveDate: null,

          lifetimeCrowns: 0,
          hasBoughtStreakFreeze: false,
          highFivesSent: 0,
          devotedDiscipleCount: 0,
          doublePortionLessonsCompleted: 0,
          vigilantSentinelCount: 0,
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
      
      setUid: (uid) => set({ uid }),
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
          
          let doublePortionCount = state.doublePortionLessonsCompleted;
          if (state.xpBoostEndTime && new Date() < new Date(state.xpBoostEndTime)) {
            doublePortionCount += 1;
          }

          return {
            doublePortionLessonsCompleted: doublePortionCount,
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
      
      restoreFromCloud: (data) =>
        set((state) => ({ ...state, ...data })),
      
      syncToCloud: async () => {
        const state = get();
        if (!state.uid || state.uid === "offline-user" || !state.username) return;
        if (!isFirebaseConfigured || !db || !auth?.currentUser) return;
        try {
          const userRef = doc(db, 'users', state.uid);
          const cleanUser = JSON.parse(JSON.stringify({
            username: state.username,
            usernameLower: state.username.toLowerCase(),
            xp: state.xp,
            weeklyXp: state.weeklyXp,
            activeWeekStr: state.activeWeekStr,
            lastWeekStr: state.lastWeekStr,
            lastWeeklyXp: state.lastWeeklyXp,
            streakDays: state.streakDays,
            crowns: state.crowns,
            streakFreezes: state.streakFreezes,
            nodeSkin: state.nodeSkin,
            ownedSkins: state.ownedSkins || ['default'],
            leagueTier: state.leagueTier,
            lastActive: new Date().toISOString(),
          }));
          await setDoc(userRef, cleanUser, { merge: true });

          const progressRef = doc(db, 'users', state.uid, 'data', 'progress');
          const cleanProgress = JSON.parse(JSON.stringify({
            entries: state.entries,
            lessonSessions: state.lessonSessions,
            completedLessons: state.completedLessons,
            achievements: state.achievements,
            lastPracticeDate: state.lastPracticeDate,
            lastQuestDate: state.lastQuestDate,
            dailyQuests: state.dailyQuests,
            lastHighFiveDate: state.lastHighFiveDate,
            highFiveCrownsToday: state.highFiveCrownsToday,
            earlyMorningsCount: state.earlyMorningsCount,
            perfectScribes: state.perfectScribes,
            lifetimeCrowns: state.lifetimeCrowns,
            hasBoughtStreakFreeze: state.hasBoughtStreakFreeze,
            highFivesSent: state.highFivesSent,
            devotedDiscipleCount: state.devotedDiscipleCount,
            doublePortionLessonsCompleted: state.doublePortionLessonsCompleted,
            vigilantSentinelCount: state.vigilantSentinelCount,
            ownedSkins: state.ownedSkins || ['default'],
          }));
          await setDoc(progressRef, cleanProgress, { merge: true });
        } catch (err) {
          console.error("Failed to sync progress to cloud:", err);
        }
      },

      // -- Economy & Quests --
      addCrowns: (amount) => set((state) => ({ 
        crowns: state.crowns + amount,
        lifetimeCrowns: state.lifetimeCrowns + amount
      })),
      
      buyStreakFreeze: () => {
        let changed = false;
        set((state) => {
          if (state.crowns >= 50) {
            changed = true;
            return { crowns: state.crowns - 50, streakFreezes: state.streakFreezes + 1, hasBoughtStreakFreeze: true };
          }
          return state;
        });
        if (changed) {
          get().syncToCloud();
        }
      },

      buyNodeSkin: (skinId) => {
        let changed = false;
        set((state) => {
          if (state.nodeSkin === skinId) return state; // already equipped

          const owned = state.ownedSkins || ['default'];
          
          if (owned.includes(skinId)) {
            changed = true;
            return { nodeSkin: skinId };
          }

          const costs: Record<string, number> = { 'obsidian': 150, 'gold': 500 };
          const cost = costs[skinId] || 0;
          if (state.crowns >= cost) {
            changed = true;
            return { crowns: state.crowns - cost, nodeSkin: skinId, ownedSkins: [...owned, skinId] };
          }
          return state;
        });
        if (changed) {
          get().syncToCloud();
        }
      },

      updateDailyQuest: (quest) => {
        set((state) => {
          const today = getLocalTodayString();
          const quests = (state.lastQuestDate && state.lastQuestDate >= today) ? { ...state.dailyQuests } : { ...DEFAULT_QUESTS };
          
          const wasClearedQueue = quests.clearedQueue;
          const wasAllComplete = quests.readQuote && quests.clearedQueue && quests.studiedNew;

          quests[quest] = true;
          
          let vigilantCount = state.vigilantSentinelCount;
          if (quest === 'clearedQueue' && !wasClearedQueue && quests.clearedQueue) {
            const hasLearnedVerses = state.entries.some(e => e.intervalDays > 0);
            if (hasLearnedVerses) {
              vigilantCount += 1;
            }
          }

          let discipleCount = state.devotedDiscipleCount;
          const isAllComplete = quests.readQuote && quests.clearedQueue && quests.studiedNew;
          if (!wasAllComplete && isAllComplete) {
            discipleCount += 1;
          }

          return { 
            dailyQuests: quests, 
            lastQuestDate: today,
            vigilantSentinelCount: vigilantCount,
            devotedDiscipleCount: discipleCount
          };
        });
        get().syncToCloud();
      },

      claimDailyChest: () => {
        let claimed = false;
        set((state) => {
          if (!state.dailyQuests.chestClaimed) {
            claimed = true;
            return { 
              dailyQuests: { ...state.dailyQuests, chestClaimed: true },
              crowns: state.crowns + 25,
              lifetimeCrowns: state.lifetimeCrowns + 25 
            };
          }
          return state;
        });
        if (claimed) {
          get().syncToCloud();
        }
      },

      activateXpBoost: () => set(() => {
        const endTime = new Date();
        endTime.setMinutes(endTime.getMinutes() + 15);
        return { xpBoostEndTime: endTime.toISOString() };
      }),

      fetchHighFives: async () => {
        const state = get();
        if (!state.uid || state.uid === "offline-user" || !isFirebaseConfigured || !db || !auth?.currentUser) return;
        try {
          const hfRef = collection(db, 'users', state.uid, 'highFives');
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
        if (!state.lastHighFiveDate || state.lastHighFiveDate < today) {
          todayCount = 0;
        }
        
        const newHighFivesSent = state.highFivesSent + 1;

        if (todayCount >= 5) {
          set({ highFivesSent: newHighFivesSent });
          get().syncToCloud();
          return false; // Daily cap reached
        }
        
        set({
          crowns: state.crowns + 1,
          lifetimeCrowns: state.lifetimeCrowns + 1,
          highFiveCrownsToday: todayCount + 1,
          lastHighFiveDate: today,
          highFivesSent: newHighFivesSent,
        });
        get().syncToCloud();
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
          state.ownedSkins = state.ownedSkins ?? ['default'];
          state.leagueTier = state.leagueTier ?? 'Bronze';
          state.dailyQuests = state.dailyQuests ?? DEFAULT_QUESTS;
          state.lifetimeCrowns = state.lifetimeCrowns ?? 0;
          state.hasBoughtStreakFreeze = state.hasBoughtStreakFreeze ?? false;
          state.highFivesSent = state.highFivesSent ?? 0;
          state.devotedDiscipleCount = state.devotedDiscipleCount ?? 0;
          state.doublePortionLessonsCompleted = state.doublePortionLessonsCompleted ?? 0;
          state.vigilantSentinelCount = state.vigilantSentinelCount ?? 0;
        }

        return state;
      },
    }
  )
);
