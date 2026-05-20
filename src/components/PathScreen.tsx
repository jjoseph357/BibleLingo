// ============================================================
// PathScreen — Vertical Node Map Grouped by Book
// ============================================================

import React, { useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useStore } from "zustand";
import { UnitStatus } from "../types/unit";
import { pathStore, getGroupedLessons, ALL_LESSONS } from "../stores/pathStore";
import { progressStore } from "../stores/progressStore";
import { lessonStore } from "../stores/lessonStore";
import { PulsingView } from "./animations/PulsingView";
import { TopBar } from "./TopBar";
import { ProgressBar } from "./animations/ProgressBar";

// ── Colour map per status ────────────────────────────────────

const NODE_COLORS: Record<UnitStatus, { bg: string; border: string; text: string }> = {
  completed: { bg: "#F5A623", border: "#D4891A", text: "#FFF" },   // gold
  current: { bg: "#4A90D9", border: "#356BA6", text: "#FFF" },   // blue
  locked: { bg: "#C8C8C8", border: "#A0A0A0", text: "#777" },   // grey
};

const STATUS_LABEL: Record<UnitStatus, string> = {
  completed: "✓",
  current: "●",
  locked: "🔒",
};

// ── Component ────────────────────────────────────────────────

interface Props {
  onStartLesson?: () => void;
  onStartReview?: () => void;
}

export function PathScreen({ onStartLesson, onStartReview }: Props) {
  const isAllUnlocked = useStore(pathStore, (s) => s.isAllUnlocked);
  const progressEntries = useStore(progressStore, (s) => s.entries);
  const lessonSessions = useStore(progressStore, (s) => s.lessonSessions);

  const sections = useMemo(() => getGroupedLessons(), [isAllUnlocked, progressEntries, lessonSessions]);

  // Count verses due for review
  const dueCount = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString();
    return progressEntries.filter(e => e.nextReviewDate <= todayStr && e.intervalDays > 0).length;
  }, [progressEntries]);

  // TODO: Replace with real practice-tracking logic.
  const hasPracticedToday = false;

  const StreakHeader = () => (
    <View style={styles.streakBanner}>
      <PulsingView active={!hasPracticedToday}>
        <Text style={styles.streakIcon}>🌅</Text>
      </PulsingView>
      <View style={styles.streakTextGroup}>
        <Text style={styles.streakTitle}>Morning Revival</Text>
        <Text style={styles.streakSubtitle}>
          {hasPracticedToday
            ? "You've practiced today ✓"
            : "Tap a lesson to start today's practice"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <TopBar />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={StreakHeader}
      renderSectionHeader={({ section }) => {
        const total = section.data.length;
        const completed = section.data.filter(u => u.status === "completed").length;
        const progress = total > 0 ? completed / total : 0;
        
        return (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <ProgressBar progress={progress} height={6} color="#4A90D9" />
          </View>
        );
      }}
      renderItem={({ item }) => {
        const colors = NODE_COLORS[item.status];
        const isPressable = item.status !== "locked";
        const session = lessonSessions[item.id];
        const isCompleted = item.status === "completed" || session?.status === "completed";

        return (
          <TouchableOpacity
            style={styles.row}
            disabled={!isPressable}
            activeOpacity={0.7}
            onPress={() => {
              if (!onStartLesson) return;
              
              // Find lessons not yet completed
              const completedRefs = new Set(progressStore.getState().entries.map(e => e.verseReference));
              const pending = item.lessons.filter(l => !completedRefs.has(l.verseReference));
              
              // If all are completed, load them all (review mode). Otherwise, load pending ones.
              const versesToLoad = pending.length > 0 ? pending : item.lessons;
              
              lessonStore.getState().loadLesson(versesToLoad, isCompleted, item.id);
              onStartLesson();
            }}
          >
            {/* Node circle */}
            <View
              style={[
                styles.node,
                { backgroundColor: colors.bg, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.nodeIcon, { color: colors.text }]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>

            {/* Unit title & Progress */}
            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.unitTitle,
                  item.status === "locked" && styles.lockedText,
                ]}
              >
                {item.title}
              </Text>
              {session && session.status === "in_progress" && (
                <Text style={styles.progressText}>
                  {Math.round(session.progressPercentage * 100)}% complete
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      }}
    />

      {/* Daily Practice FAB */}
      <TouchableOpacity
        style={[styles.fab, dueCount === 0 && styles.fabDisabled]}
        activeOpacity={0.8}
        onPress={() => {
          if (dueCount === 0) {
            Alert.alert("All Caught Up!", "You have no verses due for review. Great job! 🎉");
            return;
          }
          if (!onStartReview) return;
          
          const todayStr = new Date().toISOString();
          const dueRefs = new Set(
            progressEntries
              .filter(e => e.nextReviewDate <= todayStr && e.intervalDays > 0)
              .map(e => e.verseReference)
          );
          const dueVerses = ALL_LESSONS.filter(l => dueRefs.has(l.verseReference));
          lessonStore.getState().loadLesson(dueVerses, true);
          onStartReview();
        }}
      >
        <Text style={styles.fabText}>📖 Daily Practice</Text>
        {dueCount > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{dueCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  sectionHeaderContainer: {
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingLeft: 8,
  },
  node: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeIcon: {
    fontSize: 18,
    fontWeight: "700",
  },
  titleContainer: {
    marginLeft: 16,
    flex: 1,
    justifyContent: "center",
  },
  unitTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
  },
  progressText: {
    fontSize: 12,
    color: "#4A90D9",
    fontWeight: "bold",
    marginTop: 2,
  },
  lockedText: {
    color: "#999",
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  streakIcon: {
    fontSize: 32,
  },
  streakTextGroup: {
    marginLeft: 12,
    flexShrink: 1,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  streakSubtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90D9",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabDisabled: {
    backgroundColor: "#B0BEC5",
  },
  fabText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  fabBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    paddingHorizontal: 6,
  },
  fabBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
