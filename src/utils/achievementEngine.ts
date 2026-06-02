import { progressStore } from "../stores/progressStore";
import { db, auth, isFirebaseConfigured } from "../services/firebase";
import { doc, setDoc, increment } from "firebase/firestore";

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
  // 6. The Crown Collector
  { id: "crown_collector_1", title: "The Crown Collector I", description: "Accumulate a total of 100 lifetime Crowns." },
  { id: "crown_collector_2", title: "The Crown Collector II", description: "Accumulate a total of 500 lifetime Crowns." },
  { id: "crown_collector_3", title: "The Crown Collector III", description: "Accumulate a total of 1,000 lifetime Crowns." },

  // 7. A New Raiment
  { id: "new_raiment_1", title: "A New Raiment", description: "Purchase your first Node Skin in the Crown Shop." },

  // 8. Prepared Virgin
  { id: "prepared_virgin_1", title: "Prepared Virgin", description: "Purchase a Streak Freeze." },

  // 9. Building Up the Body
  { id: "building_body_1", title: "Building Up the Body I", description: "High-five your leaderboard companions 5 times." },
  { id: "building_body_2", title: "Building Up the Body II", description: "High-five your leaderboard companions 25 times." },
  { id: "building_body_3", title: "Building Up the Body III", description: "High-five your leaderboard companions 100 times." },

  // 10. Ascending Mount Zion
  { id: "ascending_zion_1", title: "Ascending Mount Zion I", description: "Get promoted to Silver League." },
  { id: "ascending_zion_2", title: "Ascending Mount Zion II", description: "Get promoted to Gold League." },
  { id: "ascending_zion_3", title: "Ascending Mount Zion III", description: "Get promoted to Platinum League." },
  { id: "ascending_zion_4", title: "Ascending Mount Zion IV", description: "Get promoted to Diamond League." },
  { id: "ascending_zion_5", title: "Ascending Mount Zion V", description: "Get promoted to Master League." },

  // 11. Devoted Disciple
  { id: "devoted_disciple_1", title: "Devoted Disciple I", description: "Complete all three daily quests 1 time." },
  { id: "devoted_disciple_2", title: "Devoted Disciple II", description: "Complete all three daily quests 10 times." },
  { id: "devoted_disciple_3", title: "Devoted Disciple III", description: "Complete all three daily quests 50 times." },

  // 12. Double Portion
  { id: "double_portion_1", title: "Double Portion", description: "Complete a lesson while a 15-Minute Double XP Boost is active." },

  // 13. Vigilant Sentinel
  { id: "vigilant_sentinel_1", title: "Vigilant Sentinel", description: "Completely clear your Daily Practice queue." },

  // 14. Deeply Rooted
  { id: "deeply_rooted_1", title: "Deeply Rooted I", description: "Raise a verse to Mastery 4 (Interval >= 15)." },
  { id: "deeply_rooted_2", title: "Deeply Rooted II", description: "Raise a verse to Mastery 5 (Interval >= 30)." },

  // 15. The Whole Counsel
  { id: "whole_counsel_1", title: "The Whole Counsel I", description: "Memorize verses across 3 different books." },
  { id: "whole_counsel_2", title: "The Whole Counsel II", description: "Memorize verses across 5 different books." },
  { id: "whole_counsel_3", title: "The Whole Counsel III", description: "Memorize verses across 10 different books." },
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

const getBookCount = (state: any) => {
  const books = new Set<string>();
  state.entries.forEach((e: any) => {
    if (e.intervalDays > 0) { // Only count if actually learned
      const match = e.verseReference.match(/^(\d?\s*[a-zA-Z]+)/);
      if (match) books.add(match[1].trim());
    }
  });
  return books.size;
};

const getLeagueValue = (tier: string) => {
  switch (tier) {
    case 'Silver': return 1;
    case 'Gold': return 2;
    case 'Platinum': return 3;
    case 'Diamond': return 4;
    default: return 0;
  }
};

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
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
  },
  {
    category: "crown_collector",
    getValue: (state) => state.lifetimeCrowns,
    tiers: [
      { id: "crown_collector_1", title: "The Crown Collector I", requirement: 100 },
      { id: "crown_collector_2", title: "The Crown Collector II", requirement: 500 },
      { id: "crown_collector_3", title: "The Crown Collector III", requirement: 1000 },
    ]
  },
  {
    category: "new_raiment",
    getValue: (state) => state.nodeSkin !== 'default' ? 1 : 0,
    tiers: [
      { id: "new_raiment_1", title: "A New Raiment", requirement: 1 },
    ]
  },
  {
    category: "prepared_virgin",
    getValue: (state) => state.hasBoughtStreakFreeze ? 1 : 0,
    tiers: [
      { id: "prepared_virgin_1", title: "Prepared Virgin", requirement: 1 },
    ]
  },
  {
    category: "building_body",
    getValue: (state) => state.highFivesSent,
    tiers: [
      { id: "building_body_1", title: "Building Up the Body I", requirement: 5 },
      { id: "building_body_2", title: "Building Up the Body II", requirement: 25 },
      { id: "building_body_3", title: "Building Up the Body III", requirement: 100 },
    ]
  },
  {
    category: "ascending_zion",
    getValue: (state) => getLeagueValue(state.leagueTier),
    tiers: [
      { id: "ascending_zion_1", title: "Ascending Mount Zion I", requirement: 1 },
      { id: "ascending_zion_2", title: "Ascending Mount Zion II", requirement: 2 },
      { id: "ascending_zion_3", title: "Ascending Mount Zion III", requirement: 3 },
      { id: "ascending_zion_4", title: "Ascending Mount Zion IV", requirement: 4 },
    ]
  },
  {
    category: "devoted_disciple",
    getValue: (state) => state.devotedDiscipleCount,
    tiers: [
      { id: "devoted_disciple_1", title: "Devoted Disciple I", requirement: 1 },
      { id: "devoted_disciple_2", title: "Devoted Disciple II", requirement: 10 },
      { id: "devoted_disciple_3", title: "Devoted Disciple III", requirement: 50 },
    ]
  },
  {
    category: "double_portion",
    getValue: (state) => state.doublePortionLessonsCompleted,
    tiers: [
      { id: "double_portion_1", title: "Double Portion", requirement: 1 },
    ]
  },
  {
    category: "vigilant_sentinel",
    getValue: (state) => state.vigilantSentinelCount,
    tiers: [
      { id: "vigilant_sentinel_1", title: "Vigilant Sentinel", requirement: 1 },
    ]
  },
  {
    category: "deeply_rooted",
    getValue: (state) => Math.max(0, ...state.entries.map((e: any) => e.intervalDays)),
    tiers: [
      { id: "deeply_rooted_1", title: "Deeply Rooted I", requirement: 15 },
      { id: "deeply_rooted_2", title: "Deeply Rooted II", requirement: 30 },
    ]
  },
  {
    category: "whole_counsel",
    getValue: (state) => getBookCount(state),
    tiers: [
      { id: "whole_counsel_1", title: "The Whole Counsel I", requirement: 3 },
      { id: "whole_counsel_2", title: "The Whole Counsel II", requirement: 5 },
      { id: "whole_counsel_3", title: "The Whole Counsel III", requirement: 10 },
    ]
  }
];

export function checkAchievements() {
  const pStore = progressStore.getState();
  const achievements = [...pStore.achievements];
  const newlyUnlocked: string[] = [];
  const newlyUnlockedIds: string[] = [];

  for (const cat of ACHIEVEMENT_CATEGORIES) {
    const value = cat.getValue(pStore);
    for (const tier of cat.tiers) {
      if (value >= tier.requirement && !achievements.includes(tier.id)) {
        pStore.unlockAchievement(tier.id);
        achievements.push(tier.id);
        newlyUnlocked.push(`🏆 Achievement Unlocked: ${tier.title}!`);
        newlyUnlockedIds.push(tier.id);
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    pStore.showToast(newlyUnlocked.join("\n"));

    // Play crown sound for achievements
    import("../services/AudioService").then(({ audioService }) => {
      audioService.playCrown();
    }).catch(e => console.warn("Failed to load audioService for achievement", e));

    if (isFirebaseConfigured && db && auth && auth.currentUser) {
      const statsRef = doc(db, 'stats', 'achievements');
      const updates: Record<string, any> = {};

      for (const id of newlyUnlockedIds) {
        updates[`counts.${id}`] = increment(1);
      }

      setDoc(statsRef, updates, { merge: true }).catch(err => {
        console.warn("Failed to update global achievement stats:", err);
      });
    }
  }
}
