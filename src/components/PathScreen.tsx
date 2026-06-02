// ============================================================
// PathScreen — 3D Winding Stepping-Stone Path
// ============================================================

import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useStore } from "zustand";
import { UnitStatus } from "../types/unit";
import { pathStore, getGroupedLessons, ALL_LESSONS, GroupedUnit, BookSection } from "../stores/pathStore";
import { progressStore } from "../stores/progressStore";
import { lessonStore } from "../stores/lessonStore";
import { TopBar } from "./TopBar";
import { ProgressBar } from "./animations/ProgressBar";
import { ChestAnimationModal } from "./animations/ChestAnimationModal";
import { FontAwesome5 } from "@expo/vector-icons";
import { getNodeX, generateDecorations } from "./FoliageDecorations";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PATH_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);
const NODE_SIZE = 62;
const NODE_SPACING_Y = 110;
// ── Path Data & Layout Utilities ────────────────────────────

// ── Connector line between two nodes ────────────────────────
function PathConnector({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const cx1 = x1 + NODE_SIZE / 2;
  const cy1 = y1 + NODE_SIZE;
  const cx2 = x2 + NODE_SIZE / 2;
  const cy2 = y2;
  const midX = (cx1 + cx2) / 2;
  const midY = (cy1 + cy2) / 2;
  const dx = cx2 - cx1;
  const dy = cy2 - cy1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // We draw dotted segments
  const dotCount = Math.floor(len / 12);
  const dots: React.ReactNode[] = [];
  for (let d = 0; d < dotCount; d++) {
    const t = d / dotCount;
    const px = cx1 + dx * t;
    const py = cy1 + dy * t;
    dots.push(
      <View
        key={d}
        style={{
          position: "absolute",
          left: px - 3,
          top: py - 3,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(139,119,101,0.35)",
        }}
      />
    );
  }
  return <>{dots}</>;
}

// ── Animated Stepping Stone Node ────────────────────────────

const NODE_COLORS_MAP: Record<string, Record<UnitStatus, { bg: string; border: string; glow: string; text: string; shadow: string }>> = {
  default: {
    completed: { bg: "#F5A623", border: "#D4891A", glow: "rgba(245,166,35,0.4)", text: "#FFF", shadow: "#D4891A" },
    current: { bg: "#4A90D9", border: "#356BA6", glow: "rgba(74,144,217,0.6)", text: "#FFF", shadow: "#356BA6" },
    locked: { bg: "#E5E5E5", border: "#C5C5C5", glow: "transparent", text: "#A9A9A9", shadow: "#C5C5C5" },
  },
  obsidian: {
    completed: { bg: "#2A2A35", border: "#18181E", glow: "rgba(0,230,118,0.6)", text: "#00E676", shadow: "#18181E" },
    current: { bg: "#3E3E4F", border: "#2A2A35", glow: "rgba(79,195,247,0.8)", text: "#4FC3F7", shadow: "#2A2A35" },
    locked: { bg: "#1E1E24", border: "#111115", glow: "transparent", text: "#444", shadow: "#111115" },
  },
  gold: {
    completed: { bg: "#EAB308", border: "#CA8A04", glow: "rgba(234, 179, 8, 0.6)", text: "#FFF", shadow: "#A16207" },
    current: { bg: "#FDE047", border: "#FACC15", glow: "rgba(253, 224, 71, 0.8)", text: "#713F12", shadow: "#EAB308" },
    locked: { bg: "#FEF9C3", border: "#FEF08A", glow: "transparent", text: "#CA8A04", shadow: "#FDE047" },
  },
};

interface StoneNodeProps {
  unit: GroupedUnit;
  x: number;
  y: number;
  colors: { bg: string; border: string; glow: string; text: string; shadow: string };
  onPress: () => void;
  isCurrent: boolean;
  sessionProgress: number | null;
  zIndex?: number;
  skin: string;
}

function StoneNode({ unit, x, y, colors, onPress, isCurrent, sessionProgress, zIndex, skin }: StoneNodeProps) {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Current node pulse animation
  useEffect(() => {
    if (isCurrent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ])
      ).start();
    }
  }, [isCurrent]);

  const handlePressIn = () => {
    Animated.spring(bounceAnim, { toValue: 0.88, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 0 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 12, bounciness: 12 }).start();
  };

  const isPressable = unit.status !== "locked";

  const glowScale = isCurrent
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] })
    : new Animated.Value(1);
  const glowOpacity = isCurrent
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] })
    : new Animated.Value(0);

  // Calculate distance to closest screen edge to symmetrically constrain the label width
  const cx = x + NODE_SIZE / 2;
  const sideMargin = Math.max(0, (SCREEN_WIDTH - PATH_WIDTH) / 2);
  const screenX = cx + sideMargin;

  // To keep the label perfectly centered under the node without overflowing the screen,
  // its maximum width is 2x the distance to the closest screen edge.
  // We apply a minimum width of 140 to prevent it from getting unreadably narrow.
  const safeSymmetricWidth = (Math.min(screenX, SCREEN_WIDTH - screenX) * 2) - 20;
  const LABEL_MAX_W = Math.max(140, Math.min(320, safeSymmetricWidth));

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: NODE_SIZE,
        alignItems: "center",
        transform: [{ scale: bounceAnim }],
        zIndex,
        elevation: zIndex,
      }}
    >
      {/* Glow ring for current node */}
      {isCurrent && (
        <Animated.View
          style={{
            position: "absolute",
            width: NODE_SIZE + 16,
            height: NODE_SIZE + 16,
            borderRadius: (NODE_SIZE + 16) / 2,
            backgroundColor: colors.glow,
            top: -8,
            left: -8,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        disabled={!isPressable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ alignItems: "center" }}
      >
        {/* Stone circle container to isolate absolute positioning of the 3D shadow from label size */}
        <View style={{ width: NODE_SIZE, height: NODE_SIZE, position: "relative" }}>
          {/* 3D stone base (shadow) */}
          <View
            style={{
              width: NODE_SIZE,
              height: NODE_SIZE,
              borderRadius: NODE_SIZE / 2,
              backgroundColor: colors.shadow,
              position: "absolute",
              top: 4,
              left: 0,
            }}
          />

          {/* Main stone face */}
          <View
            style={{
              width: NODE_SIZE,
              height: NODE_SIZE,
              borderRadius: NODE_SIZE / 2,
              backgroundColor: colors.bg,
              borderWidth: 3,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {/* Highlight arc */}
            <View
              style={{
                position: "absolute",
                top: 5,
                left: 8,
                width: NODE_SIZE * 0.55,
                height: NODE_SIZE * 0.3,
                borderRadius: NODE_SIZE * 0.3,
                backgroundColor: "rgba(255,255,255,0.25)",
              }}
            />

            {unit.status === "completed" && (
              <FontAwesome5 name="check" size={22} color={colors.text} />
            )}
            {unit.status === "current" && (
              <FontAwesome5 name="play" size={16} color={colors.text} style={{ marginLeft: 2 }} />
            )}
            {unit.status === "locked" && (
              <FontAwesome5 name="lock" size={16} color={colors.text} />
            )}
          </View>
        </View>

        {/* Unit label below stone */}
        <View style={{
          marginTop: 10,
          backgroundColor: isPressable ? "rgba(255,255,255,0.95)" : "rgba(240,240,240,0.8)",
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
          minWidth: Math.min(140, LABEL_MAX_W),
          maxWidth: LABEL_MAX_W,
        }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: unit.status === "locked" ? "#AAA" : "#333",
              textAlign: "center",
            }}
          >
            {unit.title}
          </Text>
        </View>

        {/* Progress indicator */}
        {sessionProgress !== null && sessionProgress < 1 && (
          <View style={{ marginTop: 4, width: 50, height: 4, backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 2, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(sessionProgress * 100)}%` as any, height: 4, backgroundColor: skin === "gold" ? "#EAB308" : (skin === "obsidian" ? "#00E676" : "#4A90D9"), borderRadius: 2 }} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}


// ── Main Component ──────────────────────────────────────────

export function PathScreen({ onStartLesson, onStartReview }: { onStartLesson?: () => void; onStartReview?: () => void }) {
  const isAllUnlocked = useStore(pathStore, (s) => s.isAllUnlocked);
  const { nodeSkin, entries: progressEntries, dailyQuests, lessonSessions } = useStore(progressStore);

  const sections = useMemo(() => getGroupedLessons(), [isAllUnlocked, progressEntries, lessonSessions]);

  const [showChestAnimation, setShowChestAnimation] = React.useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const sectionYOffsets = useRef<Record<number, number>>({});
  const playableNodesRef = useRef<{ sectionIdx: number; ny: number }[]>([]);
  playableNodesRef.current = [];

  const scrollToNextPlayable = () => {
    const currentY = scrollY.current;
    const centerY = currentY + Dimensions.get("window").height / 2;
    let targetY = Infinity;

    for (const node of playableNodesRef.current) {
      const sy = sectionYOffsets.current[node.sectionIdx] || 0;
      const absY = sy + 100 + node.ny;
      if (absY > centerY + 150 && absY < targetY) {
        targetY = absY;
      }
    }

    if (targetY !== Infinity) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY - Dimensions.get("window").height / 2), animated: true });
    } else {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const scrollToPrevPlayable = () => {
    const currentY = scrollY.current;
    const centerY = currentY + Dimensions.get("window").height / 2;
    let targetY = -Infinity;

    for (const node of playableNodesRef.current) {
      const sy = sectionYOffsets.current[node.sectionIdx] || 0;
      const absY = sy + 100 + node.ny;
      if (absY < centerY - 150 && absY > targetY) {
        targetY = absY;
      }
    }

    if (targetY !== -Infinity) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY - Dimensions.get("window").height / 2), animated: true });
    } else {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // Pre-calculate derived data for performance
  const dueCount = useMemo(() => {
    const todayStr = new Date().toISOString();
    return progressEntries.filter((e) => e.nextReviewDate <= todayStr && e.intervalDays > 0).length;
  }, [progressEntries]);

  // Accordion state for sections
  const [userToggledSections, setUserToggledSections] = React.useState<Record<string, boolean>>({});

  const isSectionCollapsed = React.useCallback((section: BookSection) => {
    if (userToggledSections[section.title] !== undefined) {
      return userToggledSections[section.title];
    }
    // Default: Collapse if 100% completed!
    const total = section.data.length;
    const completed = section.data.filter((u) => u.status === "completed").length;
    return total > 0 && completed === total;
  }, [userToggledSections]);

  const toggleSection = (section: BookSection) => {
    setUserToggledSections(prev => {
      const current = prev[section.title] !== undefined
        ? prev[section.title]
        : (section.data.length > 0 && section.data.every(u => u.status === "completed"));
      return { ...prev, [section.title]: !current };
    });
  };

  // Auto-complete quests
  const prevDueRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    progressStore.getState().updateDailyQuest("readQuote");

    const state = progressStore.getState();
    const hasLearnedVerses = state.entries.some(e => e.intervalDays > 0);

    if (dueCount === 0 && hasLearnedVerses) {
      state.updateDailyQuest("clearedQueue");

      // Only award the XP boost if they actually cleared it this session 
      // (dueCount went from > 0 to 0), so we don't accidentally start a 15-minute timer 
      // the exact second they open the app!
      if (prevDueRef.current !== null && prevDueRef.current > 0) {
        const now = new Date();
        const hasActiveBoost = state.xpBoostEndTime && new Date(state.xpBoostEndTime) > now;
        if (!hasActiveBoost) {
          state.activateXpBoost();
        }
      }
    }

    prevDueRef.current = dueCount;
  }, [dueCount]);

  // Flatten all units with a global index for positioning
  const allNodes = useMemo(() => {
    const flat: { unit: GroupedUnit; section: BookSection; sectionIdx: number }[] = [];
    sections.forEach((sec, si) => {
      sec.data.forEach((unit) => {
        flat.push({ unit, section: sec, sectionIdx: si });
      });
    });
    return flat;
  }, [sections]);

  const handleNodePress = (unit: GroupedUnit) => {
    if (!onStartLesson) return;
    const session = lessonSessions[unit.id];
    const isCompleted = unit.status === "completed" || session?.status === "completed";
    const completedRefs = new Set(progressStore.getState().entries.map((e) => e.verseReference));
    const pending = unit.lessons.filter((l) => !completedRefs.has(l.verseReference));
    const versesToLoad = pending.length > 0 ? pending : unit.lessons;
    const isReview = isCompleted && session?.status !== "in_progress";
    lessonStore.getState().loadLesson(versesToLoad, isReview, unit.id);
    onStartLesson();
  };

  const colorPalette = NODE_COLORS_MAP[nodeSkin] || NODE_COLORS_MAP.default;

  const isNight = nodeSkin === "obsidian";

  // ── Quote Card ────────────────────────────────────────────
  const QuoteCard = () => (
    <View style={[styles.quoteCard, isNight && { backgroundColor: "rgba(30, 41, 59, 0.8)", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <FontAwesome5 name="bible" size={18} color={isNight ? "#60A5FA" : "#2E75C4"} style={{ marginRight: 8 }} />
        <Text style={[styles.quoteTitle, isNight && { color: "#FFF" }]}>2 Timothy 3:16-17</Text>
      </View>
      <Text style={[styles.quoteText, isNight && { color: "#E2E8F0" }]}>
        "All Scripture is God-breathed and profitable for teaching, for reproof, for correction, for instruction in righteousness, that the man of God may be complete, fully equipped for every good work."
      </Text>
    </View>
  );

  // ── Daily Practice Card ───────────────────────────────────
  const DailyPracticeCard = () => {
    if (dueCount > 0) {
      return (
        <TouchableOpacity
          style={[styles.practiceCard, isNight && { backgroundColor: "rgba(30, 41, 59, 0.8)", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1 }]}
          activeOpacity={0.85}
          onPress={() => {
            if (!onStartReview) return;
            const todayStr = new Date().toISOString();
            const sortedDueEntries = progressEntries
              .filter((e) => e.nextReviewDate <= todayStr && e.intervalDays > 0)
              .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());

            const cappedDueEntries = sortedDueEntries.slice(0, 5);
            const dueRefs = new Set(cappedDueEntries.map((e) => e.verseReference));
            const dueVerses = ALL_LESSONS.filter((l) => dueRefs.has(l.verseReference));
            lessonStore.getState().loadLesson(dueVerses, true);
            onStartReview();
          }}
        >
          <View style={styles.practiceCardHeader}>
            <View style={styles.practiceIconCircle}>
              <FontAwesome5 name="book-reader" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.practiceCardTitle, isNight && { color: "#FFF" }]}>Daily Practice</Text>
              <Text style={[styles.practiceCardSubtitle, isNight && { color: "#94A3B8" }]}>
                {dueCount} {dueCount === 1 ? "verse" : "verses"} due for review
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
      <View style={[styles.practiceCardDone, isNight && { backgroundColor: "rgba(30, 41, 59, 0.6)", borderColor: "rgba(76, 175, 80, 0.3)" }]}>
        <FontAwesome5 name="check-circle" size={20} color={isNight ? "#4CAF50" : "#2E7D32"} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.practiceCardDoneTitle, isNight && { color: "#4CAF50" }]}>All Caught Up!</Text>
          <Text style={[styles.practiceCardDoneSubtitle, isNight && { color: "#81C784" }]}>Your practice queue is clear. Keep up the excellent work!</Text>
        </View>
      </View>
    );
  };

  // ── Daily Quests Card ─────────────────────────────────────
  const DailyQuestsCard = () => {
    const { dailyQuests } = useStore(progressStore);
    const claimDailyChest = useStore(progressStore, (s) => s.claimDailyChest);
    const isAllComplete = dailyQuests.readQuote && dailyQuests.clearedQueue && dailyQuests.studiedNew;

    return (
      <View style={[styles.questsCard, isNight && { backgroundColor: "rgba(30, 41, 59, 0.8)", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1 }]}>
        <View style={styles.questsHeader}>
          <FontAwesome5 name="clipboard-list" size={18} color={isNight ? "#60A5FA" : "#4A90D9"} />
          <Text style={[styles.questsTitle, isNight && { color: "#FFF" }]}>Daily Quests</Text>
        </View>
        <View style={styles.questRow}>
          <FontAwesome5 name={dailyQuests.readQuote ? "check-circle" : "circle"} size={16} color={dailyQuests.readQuote ? (isNight ? "#4CAF50" : "#2E7D32") : (isNight ? "#475569" : "#ccc")} />
          <Text style={[styles.questText, isNight && { color: "#CBD5E1" }, dailyQuests.readQuote && styles.questCompleted, dailyQuests.readQuote && isNight && { color: "#64748B" }]}>Read today's 2 Timothy quote</Text>
        </View>
        <View style={styles.questRow}>
          <FontAwesome5 name={dailyQuests.clearedQueue ? "check-circle" : "circle"} size={16} color={dailyQuests.clearedQueue ? (isNight ? "#4CAF50" : "#2E7D32") : (isNight ? "#475569" : "#ccc")} />
          <Text style={[styles.questText, isNight && { color: "#CBD5E1" }, dailyQuests.clearedQueue && styles.questCompleted, dailyQuests.clearedQueue && isNight && { color: "#64748B" }]}>Clear Daily Practice queue</Text>
        </View>
        <View style={styles.questRow}>
          <FontAwesome5 name={dailyQuests.studiedNew ? "check-circle" : "circle"} size={16} color={dailyQuests.studiedNew ? (isNight ? "#4CAF50" : "#2E7D32") : (isNight ? "#475569" : "#ccc")} />
          <Text style={[styles.questText, isNight && { color: "#CBD5E1" }, dailyQuests.studiedNew && styles.questCompleted, dailyQuests.studiedNew && isNight && { color: "#64748B" }]}>Master 1 new verse</Text>
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

  // ── Section accent colors ─────────────────────────────────
  const SECTION_COLORS = [
    { text: "#4A90D9", bar: "#4A90D9" },  // Blue
    { text: "#E67E22", bar: "#E67E22" },  // Warm orange
    { text: "#8E44AD", bar: "#8E44AD" },  // Purple
    { text: "#16A085", bar: "#16A085" },  // Teal
    { text: "#C0392B", bar: "#C0392B" },  // Red
    { text: "#2980B9", bar: "#2980B9" },  // Steel blue
  ];

  // ── Render the path ───────────────────────────────────────
  let globalNodeIndex = 0;

  const getBackgroundColor = () => {
    switch (nodeSkin) {
      case "obsidian": return "#1E293B"; // Deep dark slate for Obsidian
      case "gold": return "#FAFAF5"; // Clean gray-gold tint
      default: return "#F4F6F8"; // Default cool gray
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: getBackgroundColor() }}>
      <TopBar />
      <ScrollView
        ref={scrollViewRef}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header cards */}
        <View style={styles.headerCards}>
          <QuoteCard />
          <DailyPracticeCard />
          <DailyQuestsCard />
        </View>

        {/* Path area */}
        {sections.map((section, sectionIndex) => {
          const sectionStartIndex = globalNodeIndex;

          // Calculate node coordinates with chapter banner offsets
          let currentY = 30;
          let activeChapter: string | undefined = undefined;
          const sectionNodes: { unit: GroupedUnit; gi: number; nx: number; ny: number; sessionProgress: number | null }[] = [];
          const chapterBanners: { title: string; y: number; gi: number }[] = [];

          const isCollapsed = isSectionCollapsed(section);
          
          let isPrevCollapsed = true;
          if (sectionIndex > 0) {
            isPrevCollapsed = isSectionCollapsed(sections[sectionIndex - 1]);
          }

          for (let idx = 0; idx < section.data.length; idx++) {
            const unit = section.data[idx];
            const gi = sectionStartIndex + idx;

            // Detect if chapter has changed or is starting
            if (unit.chapterTitle && unit.chapterTitle !== activeChapter) {
              activeChapter = unit.chapterTitle;
              // Add a chapter banner at the current Y
              chapterBanners.push({
                title: activeChapter,
                y: currentY,
                gi,
              });
              // Advance Y coordinate to make space for the banner
              currentY += 80;
            }

            const nx = getNodeX(gi);
            const ny = currentY;
            const session = lessonSessions[unit.id];
            const sessionProgress = session && session.status === "in_progress" ? session.progressPercentage : null;

            if (unit.status === "current" && !isCollapsed) {
              playableNodesRef.current.push({ sectionIdx: sectionIndex, ny });
            }

            sectionNodes.push({ unit, gi, nx, ny, sessionProgress });
            // Dynamically increase spacing if the title is long to prevent it from overlapping the next stone or banner
            const titleLen = unit.title ? unit.title.length : 0;
            const extraSpacing = Math.max(0, Math.ceil((titleLen - 20) / 15)) * 20;
            currentY += NODE_SPACING_Y + extraSpacing;
          }

          const pathHeight = currentY + 40;

          // Section progress
          const total = section.data.length;
          const completed = section.data.filter((u) => u.status === "completed").length;
          const progress = total > 0 ? completed / total : 0;

          globalNodeIndex += section.data.length;

          // Deterministic color hashing system for chapter banners
          const CHAPTER_COLOR_PALETTES = [
            { border: "#4CAF50", text: "#2E7D32", glow: "rgba(76, 175, 80, 0.08)" },   // Emerald Green
            { border: "#9C27B0", text: "#7B1FA2", glow: "rgba(156, 39, 176, 0.08)" }, // Orchid Purple
            { border: "#FF7043", text: "#D84315", glow: "rgba(255, 112, 67, 0.08)" }, // Coral Orange
            { border: "#00BCD4", text: "#00838F", glow: "rgba(0, 188, 212, 0.08)" },  // Cyan/Teal
            { border: "#E91E63", text: "#AD1457", glow: "rgba(233, 30, 99, 0.08)" },   // Rose Pink
            { border: "#3F51B5", text: "#283593", glow: "rgba(63, 81, 181, 0.08)" },   // Royal Blue
            { border: "#FFB300", text: "#FF6F00", glow: "rgba(255, 179, 0, 0.08)" },  // Golden Amber
          ];

          const getChapterColors = (title: string) => {
            let hash = 0;
            for (let i = 0; i < title.length; i++) {
              hash = title.charCodeAt(i) + ((hash << 5) - hash);
            }
            const index = Math.abs(hash) % CHAPTER_COLOR_PALETTES.length;
            return CHAPTER_COLOR_PALETTES[index];
          };

          return (
            <View key={section.title} style={{ marginBottom: 10 }} onLayout={(e) => { sectionYOffsets.current[sectionIndex] = e.nativeEvent.layout.y; }}>
              {/* Sleek, Neutral Monochromatic Section Header Card */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleSection(section)}
                style={{
                  marginTop: 24,
                  marginBottom: isCollapsed ? 16 : 0, // only bottom margin if collapsed
                  marginHorizontal: 20,
                  padding: 18,
                  backgroundColor: (isNight || nodeSkin === 'obsidian') ? "rgba(30, 41, 59, 0.8)" : "#FFFFFF",
                  borderRadius: 16,
                  borderWidth: (isNight || nodeSkin === 'obsidian') ? 1 : 0,
                  borderColor: "rgba(255,255,255,0.08)",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: (isNight || nodeSkin === 'obsidian') ? 0.2 : 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  {/* Left Side: Title & Subtitle */}
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: (isNight || nodeSkin === 'obsidian') ? "#F8FAFC" : "#1E293B", letterSpacing: -0.5 }}>{section.title}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: (isNight || nodeSkin === 'obsidian') ? "#94A3B8" : "#64748B", textTransform: "uppercase", letterSpacing: 1 }}>{total} Stones</Text>
                      {progress === 1 && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 10 }}>
                          <FontAwesome5 name="check-circle" size={12} color={(isNight || nodeSkin === 'obsidian') ? "#4CAF50" : "#2E7D32"} />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: (isNight || nodeSkin === 'obsidian') ? "#4CAF50" : "#2E7D32", marginLeft: 4 }}>MASTERED</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Right Side: Progress Ring */}
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: (isNight || nodeSkin === 'obsidian') ? "rgba(255,255,255,0.05)" : "#F8FAFC", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: (isNight || nodeSkin === 'obsidian') ? "rgba(255,255,255,0.1)" : "#F1F5F9" }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: (isNight || nodeSkin === 'obsidian') ? "#CBD5E1" : "#94A3B8" }}>
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                </View>

                {/* Chevron icon */}
                <FontAwesome5 name={isCollapsed ? "chevron-down" : "chevron-up"} size={14} color={(isNight || nodeSkin === 'obsidian') ? "#64748B" : "#CBD5E1"} style={{ marginLeft: 12 }} />
              </TouchableOpacity>

              {/* Path canvas */}
              {!isCollapsed && (
                <View style={[styles.pathCanvas, { height: pathHeight, width: PATH_WIDTH }]}>
                {/* Background scenery / decorations */}
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
                  {generateDecorations(sectionNodes.map(n => n.ny), sectionStartIndex, nodeSkin, isPrevCollapsed).map((dec, decIdx) => {
                    return <React.Fragment key={decIdx}>{dec}</React.Fragment>;
                  })}
                </View>
                  {/* Dirt path background strips */}
                  {nodeSkin !== "gold" && sectionNodes.map((n, idx) => {
                    if (idx === 0) return null;
                    const prev = sectionNodes[idx - 1];
                    return (
                      <PathConnector
                        key={`conn-${n.gi}`}
                        x1={prev.nx}
                        y1={prev.ny}
                        x2={n.nx}
                        y2={n.ny}
                      />
                    );
                  })}

                  {/* Chapter Banners */}
                  {chapterBanners.map((cb) => {
                    const theme = getChapterColors(cb.title);

                    return (
                      <View
                        key={`cb-${cb.gi}`}
                        style={{
                          position: "absolute",
                          top: cb.y,
                          left: 10,
                          right: 10,
                          height: 60,
                          backgroundColor: "rgba(255, 255, 255, 0.96)",
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: theme.border,
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: theme.border,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 6,
                          elevation: 4,
                        }}
                      >
                        {/* Micro-glow highlight inside the banner */}
                        <View
                          style={{
                            position: "absolute",
                            top: 2,
                            left: 6,
                            right: 6,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: theme.glow,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "800",
                            color: theme.text,
                            letterSpacing: 1.2,
                            textAlign: "center",
                            paddingHorizontal: 12,
                          }}
                        >
                          {cb.title}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Nodes */}
                  {sectionNodes.map((n) => (
                    <StoneNode
                      key={n.unit.id}
                      unit={n.unit}
                      x={n.nx}
                      y={n.ny}
                      colors={colorPalette[n.unit.status]}
                      onPress={() => handleNodePress(n.unit)}
                      isCurrent={n.unit.status === "current"}
                      sessionProgress={n.sessionProgress}
                      zIndex={1000 - n.gi}
                      skin={nodeSkin}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Bottom spacer for FAB */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Daily Practice FAB */}
      {dueCount > 0 && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => {
            if (!onStartReview) return;
            const todayStr = new Date().toISOString();
            // Get due entries, sorted by urgency (oldest due date first)
            const sortedDueEntries = progressEntries
              .filter((e) => e.nextReviewDate <= todayStr && e.intervalDays > 0)
              .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());

            const cappedDueEntries = sortedDueEntries.slice(0, 5);
            const dueRefs = new Set(cappedDueEntries.map((e) => e.verseReference));
            const dueVerses = ALL_LESSONS.filter((l) => dueRefs.has(l.verseReference));
            lessonStore.getState().loadLesson(dueVerses, true);
            onStartReview();
          }}
        >
          <FontAwesome5 name="book-reader" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.fabText}>Daily Practice</Text>
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{dueCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Navigation FABs */}
      <TouchableOpacity style={styles.navFabUp} onPress={scrollToPrevPlayable}>
        <FontAwesome5 name="chevron-up" size={16} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navFabDown} onPress={scrollToNextPlayable}>
        <FontAwesome5 name="chevron-down" size={16} color="#FFF" />
      </TouchableOpacity>

      <ChestAnimationModal visible={showChestAnimation} onClose={() => setShowChestAnimation(false)} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  headerCards: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pathCanvas: {
    alignSelf: "center",
    position: "relative",
  },
  sectionHeaderContainer: {
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  // ── Card styles (preserved from original) ─────────────────
  quoteCard: {
    flexDirection: "column",
    alignItems: "stretch",
    backgroundColor: "#F0F7FF", // Premium fresh soft sky blue
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D2E4FF", // Soft blue border
    shadowColor: "#2E75C4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E75C4", // Premium deep blue title
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
    backgroundColor: "rgba(176, 190, 197, 0.6)",
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
  navFabUp: {
    position: "absolute",
    right: 20,
    bottom: 76,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(100, 116, 139, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  navFabDown: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(100, 116, 139, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  questsCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  questsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#333",
    marginLeft: 8,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  questText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 10,
    fontWeight: "500",
  },
  questCompleted: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  chestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5A623",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  chestButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 8,
  },
  chestClaimed: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chestClaimedText: {
    color: "#A0A0A0",
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 8,
  },
});
