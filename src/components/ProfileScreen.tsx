import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useStore } from "zustand";
import { progressStore } from "../stores/progressStore";
import { ALL_ACHIEVEMENTS } from "../utils/achievementEngine";
import { FontAwesome5 } from "@expo/vector-icons";

export function ProfileScreen() {
  const { xp, streakDays, achievements, perfectScribes, username } = useStore(progressStore);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>{username ? `${username}'s Profile` : "Your Profile"}</Text>

      {/* Stats Section */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <FontAwesome5 name="fire" size={28} color="#FF9500" />
          <Text style={styles.statValue}>{streakDays}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statBox}>
          <FontAwesome5 name="coins" size={28} color="#F5A623" />
          <Text style={styles.statValue}>{xp}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statBox}>
          <FontAwesome5 name="pen-fancy" size={28} color="#4A90D9" />
          <Text style={styles.statValue}>{perfectScribes}</Text>
          <Text style={styles.statLabel}>Perfect Scribes</Text>
        </View>
      </View>

      {/* Achievements Section */}
      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={styles.achievementsList}>
        {ALL_ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = achievements.includes(achievement.id);
          return (
            <View 
              key={achievement.id} 
              style={[
                styles.achievementCard,
                !isUnlocked && styles.achievementLocked
              ]}
            >
              <View style={[styles.iconWrapper, isUnlocked ? styles.iconUnlocked : styles.iconLocked]}>
                <FontAwesome5 
                  name={isUnlocked ? "medal" : "lock"} 
                  size={24} 
                  color={isUnlocked ? "#FFF" : "#999"} 
                />
              </View>
              <View style={styles.achievementText}>
                <Text style={[styles.achievementTitle, !isUnlocked && styles.textLocked]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDesc}>
                  {achievement.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
    marginBottom: 20,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#333",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginTop: 4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#444",
    marginBottom: 16,
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  achievementLocked: {
    backgroundColor: "#F0F0F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconUnlocked: {
    backgroundColor: "#F5A623",
  },
  iconLocked: {
    backgroundColor: "#E0E0E0",
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  textLocked: {
    color: "#888",
  },
  achievementDesc: {
    fontSize: 14,
    color: "#666",
  },
});
