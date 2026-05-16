import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useStore } from "zustand";
import { progressStore } from "../stores/progressStore";

export function TopBar() {
  const { streakDays, lastPracticeDate, xp } = useStore(progressStore);

  // Check if streak is active today
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  
  const isStreakActiveToday = lastPracticeDate === today && streakDays > 0;

  return (
    <View style={styles.container}>
      {/* Streak Indicator */}
      <View style={styles.badge}>
        <Text style={[styles.icon, !isStreakActiveToday && styles.iconInactive]}>🔥</Text>
        <Text style={[styles.text, isStreakActiveToday ? styles.streakActive : styles.streakInactive]}>
          {streakDays}
        </Text>
      </View>

      {/* Talents / XP Indicator */}
      <View style={styles.badge}>
        <Text style={styles.icon}>🪙</Text>
        <Text style={[styles.text, styles.talentsText]}>{xp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
  iconInactive: {
    opacity: 0.3,
  },
  text: {
    fontSize: 16,
    fontWeight: "800",
  },
  streakActive: {
    color: "#FF9500", // Orange fire color
  },
  streakInactive: {
    color: "#A0A0A0",
  },
  talentsText: {
    color: "#F5A623", // Deep gold/orange color for better contrast
  },
});
