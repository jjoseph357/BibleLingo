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
} from "react-native";
import { useStore } from "zustand";
import { UnitStatus } from "../types/unit";
import { pathStore, getGroupedLessons } from "../stores/pathStore";
import { progressStore } from "../stores/progressStore";
import { lessonStore } from "../stores/lessonStore";
import { PulsingView } from "./animations/PulsingView";
import { TopBar } from "./TopBar";

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
}

export function PathScreen({ onStartLesson }: Props) {
  const isAllUnlocked = useStore(pathStore, (s) => s.isAllUnlocked);
  const progressEntries = useStore(progressStore, (s) => s.entries);

  const sections = useMemo(() => getGroupedLessons(), [isAllUnlocked, progressEntries]);

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
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => {
        const colors = NODE_COLORS[item.status];
        const isPressable = item.status !== "locked";

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
              
              lessonStore.getState().loadLesson(versesToLoad);
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

            {/* Unit title */}
            <Text
              style={[
                styles.unitTitle,
                item.status === "locked" && styles.lockedText,
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
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
  unitTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
    marginLeft: 16,
    flexShrink: 1,
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
});
