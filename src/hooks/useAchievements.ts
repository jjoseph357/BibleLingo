import { checkAchievements as checkAchievementsEngine } from "../utils/achievementEngine";

export function useAchievements() {
  return {
    checkAchievements: checkAchievementsEngine,
  };
}
