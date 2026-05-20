// Mock AsyncStorage to work in Node.js environment
jest.mock("@react-native-async-storage/async-storage", () => {
  const mockStorage: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        for (const key in mockStorage) {
          delete mockStorage[key];
        }
        return Promise.resolve();
      }),
    }
  };
});

import { progressStore } from "../../stores/progressStore";
import { checkAchievements, ALL_ACHIEVEMENTS } from "../achievementEngine";

describe("achievementEngine", () => {
  beforeEach(() => {
    progressStore.getState().reset();
  });

  test("initial achievements list contains all expanded tiers", () => {
    expect(ALL_ACHIEVEMENTS.length).toBe(15);
    expect(ALL_ACHIEVEMENTS.find(a => a.id === "good_land_explorer_1")).toBeDefined();
    expect(ALL_ACHIEVEMENTS.find(a => a.id === "good_land_explorer_2")).toBeDefined();
    expect(ALL_ACHIEVEMENTS.find(a => a.id === "the_overcomer_3")).toBeDefined();
    expect(ALL_ACHIEVEMENTS.find(a => a.id === "redeeming_the_time_2")).toBeDefined();
  });

  test("unlocks Explorer I and then Explorer II on completing 15 lessons, skipping double unlock", () => {
    const store = progressStore.getState();

    // 1. Simulate completing 5 lessons (simulated via entries that have intervalDays > 0)
    for (let i = 1; i <= 5; i++) {
      store.addOrUpdate({
        verseReference: `Ref ${i}`,
        intervalDays: 1,
        repetitions: 1,
        nextReviewDate: new Date().toISOString()
      });
    }

    checkAchievements();
    expect(progressStore.getState().achievements).toContain("good_land_explorer_1");
    expect(progressStore.getState().achievements).not.toContain("good_land_explorer_2");

    // 2. Simulate completing 10 more lessons (total 15)
    for (let i = 6; i <= 15; i++) {
      store.addOrUpdate({
        verseReference: `Ref ${i}`,
        intervalDays: 1,
        repetitions: 1,
        nextReviewDate: new Date().toISOString()
      });
    }

    checkAchievements();
    expect(progressStore.getState().achievements).toContain("good_land_explorer_1");
    expect(progressStore.getState().achievements).toContain("good_land_explorer_2");
    expect(progressStore.getState().achievements).not.toContain("good_land_explorer_3");
  });

  test("unlocks Overcomer streak tiers correctly", () => {
    // Modify streak directly in store
    progressStore.setState({ streakDays: 7 });
    checkAchievements();

    const achievements = progressStore.getState().achievements;
    expect(achievements).toContain("the_overcomer_1"); // Tier 1 (3 days)
    expect(achievements).toContain("the_overcomer_2"); // Tier 2 (7 days)
    expect(achievements).not.toContain("the_overcomer_3"); // Tier 3 (30 days)
  });

  test("unlocks Faithful Steward XP tiers correctly", () => {
    progressStore.setState({ xp: 2000 });
    checkAchievements();

    const achievements = progressStore.getState().achievements;
    expect(achievements).toContain("faithful_steward_1"); // 500 XP
    expect(achievements).toContain("faithful_steward_2"); // 2000 XP
    expect(achievements).not.toContain("faithful_steward_3"); // 5000 XP
  });

  test("unlocks Redeeming the Time early morning tiers correctly", () => {
    progressStore.setState({ earlyMorningsCount: 5 });
    checkAchievements();

    const achievements = progressStore.getState().achievements;
    expect(achievements).toContain("redeeming_the_time_1"); // 1 time
    expect(achievements).toContain("redeeming_the_time_2"); // 5 times
  });
});
