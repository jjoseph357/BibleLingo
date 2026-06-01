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
  ScrollView,
} from "react-native";
import { useStore } from "zustand";
import { progressStore } from "../stores/progressStore";
import { ALL_LESSONS } from "../stores/pathStore";
import { TopBar } from "./TopBar";
import { fetchLessonVerses } from "../services/bibleApi";
import { FontAwesome5 } from "@expo/vector-icons";

// ── Types ───────────────────────────────────────────────────

interface LibraryVerse {
  bookPath: string;
  verseReference: string;
  allTags: string[];
  unitLabels: string[];
  stepIndex: number;
  totalSteps: number;
  masteryPercentage: number;
  strengthDays: number;
}

// ── Hook: Data Aggregation ───────────────────────────────────

function useLibraryVerses(): LibraryVerse[] {
  const lessonSessions = useStore(progressStore, (s) => s.lessonSessions);
  const progressEntries = useStore(progressStore, (s) => s.entries);

  return useMemo(() => {
    const deDuped = new Map<string, LibraryVerse>();
    const entriesMap = new Map(progressEntries.map(e => [e.verseReference, e]));

    // Iterate through all flat verse items in ALL_LESSONS
    for (const verseItem of ALL_LESSONS) {
      const srsEntry = entriesMap.get(verseItem.verseReference);
      const unitId = `${verseItem.bookPath}-${verseItem.unitTitle}`;
      const session = lessonSessions[unitId];
      
      let stepIndex = session?.verseStepIndex?.[verseItem.verseReference] ?? 0;
      const isUnitCompleted = session?.status === "completed";

      // Only include started verses (either has srs entry or stepIndex > 0)
      if (srsEntry || stepIndex > 0 || isUnitCompleted) {
        const totalSteps = verseItem.difficulty === "Easy" ? 7 : verseItem.difficulty === "Medium" ? 11 : 13;
        
        if (isUnitCompleted) {
          stepIndex = totalSteps;
        }

        const clampedStep = Math.min(stepIndex, totalSteps);
        const masteryPercentage = clampedStep / totalSteps;
        const strengthDays = srsEntry ? srsEntry.intervalDays : 0;
        
        const unitLabel = verseItem.unitTitle || verseItem.lessonId;
        const tags = verseItem.themeTags || [];

        if (deDuped.has(verseItem.verseReference)) {
          const existing = deDuped.get(verseItem.verseReference)!;
          
          // Append unique unitLabels
          if (!existing.unitLabels.includes(unitLabel)) {
            existing.unitLabels.push(unitLabel);
          }
          
          // Append unique tags
          tags.forEach(t => {
            if (!existing.allTags.includes(t)) {
              existing.allTags.push(t);
            }
          });
          
          // Keep the best mastery progress
          if (clampedStep > existing.stepIndex) {
            existing.stepIndex = clampedStep;
            existing.totalSteps = totalSteps;
            existing.masteryPercentage = masteryPercentage;
          }
          
          // Keep the highest memory strength
          if (strengthDays > existing.strengthDays) {
            existing.strengthDays = strengthDays;
          }
        } else {
          deDuped.set(verseItem.verseReference, {
            bookPath: verseItem.bookPath,
            verseReference: verseItem.verseReference,
            unitLabels: [unitLabel],
            allTags: [...tags],
            stepIndex: clampedStep,
            totalSteps: totalSteps,
            masteryPercentage: masteryPercentage,
            strengthDays: strengthDays,
          });
        }
      }
    }

    const list = Array.from(deDuped.values());

    // Sort descending: highest memory strength first, then by mastery percentage
    return list.sort((a, b) => {
      if (b.strengthDays !== a.strengthDays) {
        return b.strengthDays - a.strengthDays;
      }
      return b.masteryPercentage - a.masteryPercentage;
    });
  }, [lessonSessions, progressEntries]);
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
        
        <Text style={styles.bookPath} numberOfLines={1} ellipsizeMode="tail">
          {item.bookPath} • {item.unitLabels[0]}
          {item.unitLabels.length > 1 ? ` (+${item.unitLabels.length - 1})` : ''}
        </Text>
        
        <View style={styles.footerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', flex: 1, overflow: 'hidden' }}>
            <FontAwesome5 name="tag" size={11} color="#4A5568" style={{ marginRight: 4 }} />
            <Text style={styles.themeTag} numberOfLines={1} ellipsizeMode="tail">
              {item.allTags.length > 0 ? item.allTags.slice(0, 2).join(", ") : "General"}
              {item.allTags.length > 2 ? ` (+${item.allTags.length - 2})` : ''}
            </Text>
            
            {item.strengthDays > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                <FontAwesome5 name="brain" size={11} color="#FF9500" style={{ marginRight: 4 }} />
                <Text style={styles.strengthText}>Strength: {item.strengthDays}d</Text>
              </View>
            )}
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

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#4A90D9" style={{ marginVertical: 40 }} />
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <>
                  <Text style={styles.modalVerseText}>"{verseText}"</Text>
                  
                  {selectedVerse && (
                    <View style={styles.modalMetadataContainer}>
                      <Text style={styles.modalMetaLabel}>Collections</Text>
                      <Text style={styles.modalMetaValue}>{selectedVerse.unitLabels.join(", ")}</Text>
                      
                      <Text style={[styles.modalMetaLabel, { marginTop: 16 }]}>Tags</Text>
                      <Text style={styles.modalMetaValue}>{selectedVerse.allTags.join(", ") || "General"}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
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
  strengthText: {
    fontSize: 13,
    color: "#D4891A",
    fontWeight: "700",
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
  modalMetadataContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#EDF2F7",
  },
  modalMetaLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A0AEC0",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalMetaValue: {
    fontSize: 16,
    color: "#4A5568",
    lineHeight: 24,
  },
});
