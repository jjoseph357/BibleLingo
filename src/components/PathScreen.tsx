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
import { TopBar } from "./TopBar";
import { ProgressBar } from "./animations/ProgressBar";
import { ChestAnimationModal } from "./animations/ChestAnimationModal";
import { FontAwesome5 } from "@expo/vector-icons";

// ── Colour map per status ────────────────────────────────────

// ── Colour map per status ────────────────────────────────────

const NODE_COLORS: Record<string, Record<UnitStatus, { bg: string; border: string; text: string }>> = {
  default: {
    completed: { bg: "#F5A623", border: "#D4891A", text: "#FFF" },   // gold
    current: { bg: "#4A90D9", border: "#356BA6", text: "#FFF" },   // blue
    locked: { bg: "#C8C8C8", border: "#A0A0A0", text: "#777" },   // grey
  },
  obsidian: {
    completed: { bg: "#333333", border: "#1A1A1A", text: "#00E676" }, // dark with neon green text
    current: { bg: "#555555", border: "#333333", text: "#4FC3F7" },   // lighter dark with neon blue text
    locked: { bg: "#C8C8C8", border: "#A0A0A0", text: "#777" },
  },
  gold: {
    completed: { bg: "#FFD700", border: "#B8860B", text: "#8B4500" }, // solid gold
    current: { bg: "#FFEC8B", border: "#DAA520", text: "#8B4500" },   // light gold
    locked: { bg: "#C8C8C8", border: "#A0A0A0", text: "#777" },
  }
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

  const nodeSkin = useStore(progressStore, (s) => s.nodeSkin) || 'default';

  // Chest animation state
  const [showChestAnimation, setShowChestAnimation] = React.useState(false);

  // Auto-complete Quests
  React.useEffect(() => {
    // Reading the quote is considered done by viewing this screen
    progressStore.getState().updateDailyQuest('readQuote');
    
    // If the queue is 0, they cleared it
    if (dueCount === 0) {
      progressStore.getState().updateDailyQuest('clearedQueue');
      // Also potentially trigger Double XP Boost
      if (!progressStore.getState().xpBoostEndTime) {
        progressStore.getState().activateXpBoost();
      }
    }
  }, [dueCount]);

  const QuoteCard = () => (
    <View style={styles.quoteCard}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <FontAwesome5 
          name="bible" 
          size={18} 
          color="#F5A623" 
          style={{ marginRight: 8 }} 
        />
        <Text style={styles.quoteTitle}>2 Timothy 3:16-17</Text>
      </View>
      <Text style={styles.quoteText}>
        "All Scripture is God-breathed and profitable for teaching, for reproof, for correction, for instruction in righteousness, that the man of God may be complete, fully equipped for every good work."
      </Text>
    </View>
  );

  const DailyPracticeCard = () => {
    if (dueCount > 0) {
      return (
        <TouchableOpacity
          style={styles.practiceCard}
          activeOpacity={0.85}
          onPress={() => {
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
          <View style={styles.practiceCardHeader}>
            <View style={styles.practiceIconCircle}>
              <FontAwesome5 name="book-reader" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.practiceCardTitle}>Daily Practice</Text>
              <Text style={styles.practiceCardSubtitle}>
                {dueCount} {dueCount === 1 ? 'verse' : 'verses'} due for review
              </Text>
            </View>
            <View style={styles.practiceStartBadge}>
              <FontAwesome5 name="play" size={12} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.practiceStartText}>Start</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.practiceCardDone}>
        <FontAwesome5 name="check-circle" size={20} color="#2E7D32" style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.practiceCardDoneTitle}>All Caught Up!</Text>
          <Text style={styles.practiceCardDoneSubtitle}>Your practice queue is clear. Keep up the excellent work!</Text>
        </View>
      </View>
    );
  };

  const DailyQuestsCard = () => {
    const { dailyQuests } = useStore(progressStore);
    const claimDailyChest = useStore(progressStore, s => s.claimDailyChest);
    
    const isAllComplete = dailyQuests.readQuote && dailyQuests.clearedQueue && dailyQuests.studiedNew;

    return (
      <View style={styles.questsCard}>
        <View style={styles.questsHeader}>
          <FontAwesome5 name="clipboard-list" size={18} color="#4A90D9" />
          <Text style={styles.questsTitle}>Daily Quests</Text>
        </View>
        
        <View style={styles.questRow}>
          <FontAwesome5 name={dailyQuests.readQuote ? "check-circle" : "circle"} size={16} color={dailyQuests.readQuote ? "#2E7D32" : "#ccc"} />
          <Text style={[styles.questText, dailyQuests.readQuote && styles.questCompleted]}>Read today's 2 Timothy quote</Text>
        </View>
        <View style={styles.questRow}>
          <FontAwesome5 name={dailyQuests.clearedQueue ? "check-circle" : "circle"} size={16} color={dailyQuests.clearedQueue ? "#2E7D32" : "#ccc"} />
          <Text style={[styles.questText, dailyQuests.clearedQueue && styles.questCompleted]}>Clear Daily Practice queue</Text>
        </View>
        <View style={styles.questRow}>
          <FontAwesome5 name={dailyQuests.studiedNew ? "check-circle" : "circle"} size={16} color={dailyQuests.studiedNew ? "#2E7D32" : "#ccc"} />
          <Text style={[styles.questText, dailyQuests.studiedNew && styles.questCompleted]}>Study 1 new verse</Text>
        </View>

        {isAllComplete && (
          <TouchableOpacity 
            style={[styles.chestButton, dailyQuests.chestClaimed && styles.chestClaimed]}
            onPress={() => {
              if (!dailyQuests.chestClaimed) {
                claimDailyChest();
                setShowChestAnimation(true);
              }
            }}
            disabled={dailyQuests.chestClaimed}
          >
            <FontAwesome5 name={dailyQuests.chestClaimed ? "box-open" : "box"} size={16} color={dailyQuests.chestClaimed ? "#A0A0A0" : "#FFF"} />
            <Text style={dailyQuests.chestClaimed ? styles.chestClaimedText : styles.chestButtonText}>
              {dailyQuests.chestClaimed ? "Chest Claimed" : "Open Daily Chest"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const Header = () => (
    <View>
      <QuoteCard />
      <DailyPracticeCard />
      <DailyQuestsCard />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <TopBar />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={Header}
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
        const colors = (NODE_COLORS[nodeSkin] || NODE_COLORS.default)[item.status];
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
              const isReview = isCompleted && session?.status !== "in_progress";
              lessonStore.getState().loadLesson(versesToLoad, isReview, item.id);
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
              {item.status === "completed" && (
                <FontAwesome5 name="check" size={16} color={colors.text} />
              )}
              {item.status === "current" && (
                <FontAwesome5 name="play" size={12} color={colors.text} style={{ marginLeft: 2 }} />
              )}
              {item.status === "locked" && (
                <FontAwesome5 name="lock" size={14} color={colors.text} />
              )}
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
            Alert.alert("All Caught Up!", "You have no verses due for review. Great job!");
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
        <FontAwesome5 name="book-reader" size={18} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.fabText}>Daily Practice</Text>
        {dueCount > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{dueCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <ChestAnimationModal
        visible={showChestAnimation}
        onClose={() => setShowChestAnimation(false)}
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
  quoteCard: {
    flexDirection: "column",
    alignItems: "stretch",
    backgroundColor: "#FFF8E7",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#D4891A",
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5C5C5C",
    fontStyle: "italic",
  },
  practiceCard: {
    backgroundColor: "#4A90D9",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#4A90D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  practiceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  practiceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  practiceCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
  },
  practiceCardSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontWeight: "500",
  },
  practiceStartBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  practiceStartText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
  },
  practiceCardDone: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  practiceCardDoneTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
  },
  practiceCardDoneSubtitle: {
    fontSize: 13,
    color: "#4CAF50",
    marginTop: 2,
    fontWeight: "500",
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
  questsCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginLeft: 8,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  questText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    fontWeight: '500',
  },
  questCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  chestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A623',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  chestButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
  },
  chestClaimed: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chestClaimedText: {
    color: '#A0A0A0',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
  }
});
