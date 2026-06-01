import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useStore } from "zustand";
import { progressStore } from "../stores/progressStore";
import { ALL_ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, checkAchievements } from "../utils/achievementEngine";
import { FontAwesome5 } from "@expo/vector-icons";
import { auth } from "../services/firebase";
import { signOut } from "firebase/auth";

export function ProfileScreen() {
  const state = useStore(progressStore);
  const { xp, streakDays, achievements, perfectScribes, username, uid } = state;

  useEffect(() => {
    // Auto-heal: Ensure any achievements earned (e.g., via Shop, Dev Tools, etc.)
    // that missed the post-lesson check get awarded when viewing the profile!
    checkAchievements();
  }, [state]);

  const getAchievementProgress = (achievementId: string) => {
    for (const cat of ACHIEVEMENT_CATEGORIES) {
      const tier = cat.tiers.find(t => t.id === achievementId);
      if (tier) {
        return { value: cat.getValue(state), requirement: tier.requirement };
      }
    }
    return { value: 0, requirement: 1 };
  };

  const sortedAchievements = [...ALL_ACHIEVEMENTS].sort((a, b) => {
    const aUnlocked = achievements.includes(a.id);
    const bUnlocked = achievements.includes(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return 0;
  });

  const handleSignOut = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Firebase signOut error:", e);
      }
    }
    progressStore.getState().reset();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Title & Sign Out Button */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {username ? `${username}` : "Profile"}
        </Text>
        <TouchableOpacity 
          style={styles.headerSignOutButton} 
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <FontAwesome5 
            name={uid === "offline-user" ? "sign-out-alt" : "power-off"} 
            size={12} 
            color="#E53935" 
            style={{ marginRight: 6 }}
          />
          <Text style={styles.headerSignOutButtonText}>
            {uid === "offline-user" ? "Exit Offline" : "Log Out"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <FontAwesome5 name="fire" size={28} color="#FF9500" />
          <Text style={styles.statValue}>{streakDays}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statBox}>
          <FontAwesome5 name="star" size={28} color="#F5A623" />
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
        {sortedAchievements.map((achievement) => {
          const isUnlocked = achievements.includes(achievement.id);
          const prog = getAchievementProgress(achievement.id);
          const progressRatio = Math.min(prog.value / prog.requirement, 1);
          
          return (
            <View 
              key={achievement.id} 
              style={[
                styles.achievementCard,
                !isUnlocked && styles.achievementLocked
              ]}
            >
              <View style={[styles.iconWrapper, isUnlocked && styles.iconUnlocked]}>
                {isUnlocked ? (
                  <FontAwesome5 name="medal" size={24} color="#FFF" />
                ) : (
                  <View style={styles.progressCircleBg}>
                    <View style={[styles.progressCircleFill, { height: `${progressRatio * 100}%` }]} />
                    <View style={styles.progressCircleOverlay}>
                      <FontAwesome5 name="lock" size={16} color="#A0AEC0" />
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.achievementText}>
                <Text style={[styles.achievementTitle, !isUnlocked && styles.textLocked]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDesc}>
                  {achievement.description}
                </Text>
                {!isUnlocked && (
                  <Text style={styles.progressLabel}>
                    Progress: {prog.value} / {prog.requirement}
                  </Text>
                )}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#333",
    flex: 1,
    marginRight: 12,
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
  progressCircleBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EDF2F7",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  progressCircleFill: {
    width: "100%",
    backgroundColor: "#90CDF4",
  },
  progressCircleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0AEC0",
    marginTop: 6,
  },
  headerSignOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerSignOutButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E53935",
  },
});
