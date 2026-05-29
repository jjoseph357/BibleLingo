import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useStore } from "zustand";
import { progressStore } from "../stores/progressStore";
import { ALL_LESSONS } from "../stores/pathStore";
import { TopBar } from "./TopBar";
import { fetchLessonVerses } from "../services/bibleApi";
import { FontAwesome5 } from "@expo/vector-icons";

// ── Types ───────────────────────────────────────────────────

interface LibraryVerse {
  lessonId: string;
  bookPath: string;
  verseReference: string;
  themeTag: string;
  stepIndex: number;
  totalSteps: number;
  masteryPercentage: number;
}

// ── Hook: Data Aggregation ───────────────────────────────────

function useLibraryVerses(): LibraryVerse[] {
  const lessonSessions = useStore(progressStore, (s) => s.lessonSessions);

  return useMemo(() => {
    const list: LibraryVerse[] = [];

    // Iterate through all static lessons
    for (const lesson of ALL_LESSONS) {
      const session = lessonSessions[lesson.id];
      if (!session || !session.verseStepIndex) continue;

      // Iterate through the lesson's verses
      for (const verse of lesson.verses) {
        const stepIndex = session.verseStepIndex[verse.verseReference] ?? 0;
        
        // Only include started verses
        if (stepIndex > 0) {
          const trackLength = verse.masteryTrack?.length || 1;
          // Step index could theoretically exceed track length if completed
          const clampedStep = Math.min(stepIndex, trackLength);
          
          list.push({
            lessonId: lesson.id,
            bookPath: lesson.bookPath || "",
            verseReference: verse.verseReference,
            themeTag: verse.themeTags?.[0] || "General",
            stepIndex: clampedStep,
            totalSteps: trackLength,
            masteryPercentage: clampedStep / trackLength,
          });
        }
      }
    }

    // Sort by most recently learned (or by mastery percentage)
    // For now, sorting descending by percentage so fully mastered are at the top
    return list.sort((a, b) => b.masteryPercentage - a.masteryPercentage);
  }, [lessonSessions]);
}

// ── Component ────────────────────────────────────────────────

export function LibraryScreen() {
  const libraryVerses = useLibraryVerses();
  
  const [selectedVerse, setSelectedVerse] = useState<LibraryVerse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [verseText, setVerseText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePressVerse = async (item: LibraryVerse) => {
    setSelectedVerse(item);
    setModalVisible(true);
    setIsLoading(true);
    setVerseText(null);
    setError(null);

    try {
      const { verses } = await fetchLessonVerses([item.verseReference]);
      const text = verses[item.verseReference];
      if (text) {
        setVerseText(text);
      } else {
        setError("Verse text not found.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load verse.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedVerse(null);
  };

  const renderItem = ({ item }: { item: LibraryVerse }) => {
    const isMastered = item.masteryPercentage >= 1;
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handlePressVerse(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.reference}>{item.verseReference}</Text>
          <View style={[styles.badge, isMastered && styles.badgeMastered]}>
            {isMastered ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome5 name="star" size={12} color="#B7791F" style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, styles.badgeTextMastered]}>Mastered</Text>
              </View>
            ) : (
              <Text style={styles.badgeText}>{item.stepIndex}/{item.totalSteps} Steps</Text>
            )}
          </View>
        </View>
        
        <Text style={styles.bookPath}>{item.bookPath}</Text>
        
        <View style={styles.footerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome5 name="tag" size={12} color="#4A5568" style={{ marginRight: 4 }} />
            <Text style={styles.themeTag}>{item.themeTag}</Text>
          </View>
          {/* Visual Mini Progress Bar */}
          <View style={styles.miniBarBg}>
            <View 
              style={[
                styles.miniBarFill, 
                { width: `${Math.min(item.masteryPercentage * 100, 100)}%` },
                isMastered && { backgroundColor: "#F5A623" }
              ]} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar />
      
      <View style={styles.headerArea}>
        <Text style={styles.title}>Your Library</Text>
        <Text style={styles.subtitle}>
          {libraryVerses.length} {libraryVerses.length === 1 ? "verse" : "verses"} started
        </Text>
      </View>

      <FlatList
        data={libraryVerses}
        keyExtractor={(item) => item.verseReference}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Your library is empty. Start a lesson on the Path to begin collecting verses!
            </Text>
          </View>
        }
      />

      {/* Verse Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedVerse?.verseReference}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#4A90D9" style={{ marginVertical: 40 }} />
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <Text style={styles.modalVerseText}>"{verseText}"</Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2D3748",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#718096",
    marginTop: 4,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reference: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D3748",
  },
  badge: {
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeMastered: {
    backgroundColor: "#FEFCBF",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3182CE",
  },
  badgeTextMastered: {
    color: "#B7791F",
  },
  bookPath: {
    fontSize: 14,
    color: "#A0AEC0",
    marginBottom: 12,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  themeTag: {
    fontSize: 13,
    color: "#4A5568",
    fontWeight: "600",
  },
  miniBarBg: {
    width: 60,
    height: 6,
    backgroundColor: "#EDF2F7",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    backgroundColor: "#3182CE",
    borderRadius: 3,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#A0AEC0",
    textAlign: "center",
    lineHeight: 24,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2D3748",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDF2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#718096",
  },
  modalBody: {
    paddingBottom: 20,
  },
  modalVerseText: {
    fontSize: 20,
    lineHeight: 32,
    color: "#2D3748",
    fontStyle: "italic",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#E53E3E",
    textAlign: "center",
  },
});
