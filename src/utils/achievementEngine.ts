import { progressStore } from "../stores/progressStore";

export const ALL_ACHIEVEMENTS = [
  // 1. The Good Land Explorer
  { id: "good_land_explorer_1", title: "The Good Land Explorer I", description: "Completed 5 lessons." },
  { id: "good_land_explorer_2", title: "The Good Land Explorer II", description: "Completed 15 lessons." },
  { id: "good_land_explorer_3", title: "The Good Land Explorer III", description: "Completed 30 lessons." },
  { id: "good_land_explorer_4", title: "The Good Land Explorer IV", description: "Completed 50 lessons." },

  // 2. The Overcomer
  { id: "the_overcomer_1", title: "The Overcomer I", description: "Reached a 3-day streak." },
  { id: "the_overcomer_2", title: "The Overcomer II", description: "Reached a 7-day streak." },
  { id: "the_overcomer_3", title: "The Overcomer III", description: "Reached a 30-day streak." },

  // 3. The Scribe
  { id: "the_scribe_1", title: "The Scribe I", description: "Successfully scribed 10 verses." },
  { id: "the_scribe_2", title: "The Scribe II", description: "Successfully scribed 50 verses." },
  { id: "the_scribe_3", title: "The Scribe III", description: "Successfully scribed 100 verses." },

  // 4. Faithful Steward
  { id: "faithful_steward_1", title: "Faithful Steward I", description: "Earned 500 XP." },
  { id: "faithful_steward_2", title: "Faithful Steward II", description: "Earned 2000 XP." },
  { id: "faithful_steward_3", title: "Faithful Steward III", description: "Earned 5000 XP." },

  // 5. Redeeming the Time
  { id: "redeeming_the_time_1", title: "Redeeming the Time I", description: "Practiced early in the morning 1 time." },
  { id: "redeeming_the_time_2", title: "Redeeming the Time II", description: "Practiced early in the morning 5 times." },
];

interface Tier {
  id: string;
  title: string;
  requirement: number;
}

interface AchievementCategory {
  category: string;
  getValue: (state: any) => number;
  tiers: Tier[];
}

const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  {
    category: "good_land_explorer",
    getValue: (state) => state.entries.filter((e: any) => e.intervalDays > 0).length,
    tiers: [
      { id: "good_land_explorer_1", title: "The Good Land Explorer I", requirement: 5 },
      { id: "good_land_explorer_2", title: "The Good Land Explorer II", requirement: 15 },
      { id: "good_land_explorer_3", title: "The Good Land Explorer III", requirement: 30 },
      { id: "good_land_explorer_4", title: "The Good Land Explorer IV", requirement: 50 },
    ]
  },
  {
    category: "the_overcomer",
    getValue: (state) => state.streakDays,
    tiers: [
      { id: "the_overcomer_1", title: "The Overcomer I", requirement: 3 },
      { id: "the_overcomer_2", title: "The Overcomer II", requirement: 7 },
      { id: "the_overcomer_3", title: "The Overcomer III", requirement: 30 },
    ]
  },
  {
    category: "the_scribe",
    getValue: (state) => state.perfectScribes,
    tiers: [
      { id: "the_scribe_1", title: "The Scribe I", requirement: 10 },
      { id: "the_scribe_2", title: "The Scribe II", requirement: 50 },
      { id: "the_scribe_3", title: "The Scribe III", requirement: 100 },
    ]
  },
  {
    category: "faithful_steward",
    getValue: (state) => state.xp,
    tiers: [
      { id: "faithful_steward_1", title: "Faithful Steward I", requirement: 500 },
      { id: "faithful_steward_2", title: "Faithful Steward II", requirement: 2000 },
      { id: "faithful_steward_3", title: "Faithful Steward III", requirement: 5000 },
    ]
  },
  {
    category: "redeeming_the_time",
    getValue: (state) => state.earlyMorningsCount,
    tiers: [
      { id: "redeeming_the_time_1", title: "Redeeming the Time I", requirement: 1 },
      { id: "redeeming_the_time_2", title: "Redeeming the Time II", requirement: 5 },
    ]
  }
];

export function checkAchievements() {
  const pStore = progressStore.getState();
  const achievements = [...pStore.achievements];
  const newlyUnlocked: string[] = [];

  for (const cat of ACHIEVEMENT_CATEGORIES) {
    const value = cat.getValue(pStore);
    for (const tier of cat.tiers) {
      if (value >= tier.requirement && !achievements.includes(tier.id)) {
        pStore.unlockAchievement(tier.id);
        achievements.push(tier.id);
        newlyUnlocked.push(`🏆 Achievement Unlocked: ${tier.title}!`);
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    pStore.showToast(newlyUnlocked.join("\n"));
  }
}
