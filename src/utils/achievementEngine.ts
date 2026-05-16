import { Alert } from "react-native";
import { progressStore } from "../stores/progressStore";

export function checkAchievements() {
  const pStore = progressStore.getState();
  const achievements = [...pStore.achievements];
  const newlyUnlocked: string[] = [];

  const checkUnlock = (id: string, title: string, message: string) => {
    if (!achievements.includes(id)) {
      pStore.unlockAchievement(id);
      achievements.push(id);
      newlyUnlocked.push(`🏆 ${title}\n${message}`);
    }
  };

  // 1. "The Good Land Explorer" (completed 5 lessons)
  const completedCount = pStore.entries.filter((e) => e.intervalDays > 0).length;
  if (completedCount >= 5) {
    checkUnlock("good_land_explorer", "The Good Land Explorer", "Completed 5 lessons.");
  }

  // 2. "Redeeming the Time" (completed between 5:00 AM and 7:00 AM)
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) {
    checkUnlock("redeeming_the_time", "Redeeming the Time", "Practiced early in the morning.");
  }

  // 3. "The Scribe" (perfectScribes >= 50)
  if (pStore.perfectScribes >= 50) {
    checkUnlock("the_scribe", "The Scribe", "Successfully scribed 50 verses.");
  }

  if (newlyUnlocked.length > 0) {
    Alert.alert("Achievement Unlocked!", newlyUnlocked.join("\n\n"), [
      { text: "Awesome!" },
    ]);
  }
}
