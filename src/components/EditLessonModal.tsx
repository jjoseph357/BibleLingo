import React, { useState, useMemo } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Switch, ActivityIndicator } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { customPathStore, CustomPathGroup } from "../stores/customPathStore";
import { fetchLessonVerses } from "../services/bibleApi";
import { progressStore } from "../stores/progressStore";

interface Props {
  visible: boolean;
  onClose: () => void;
  pathId: string;
  editingGroupIndex?: number;
  editingGroup?: CustomPathGroup;
}

const SINGLE_CHAPTER_BOOKS = new Set(["Philem.", "2 John", "3 John", "Jude", "Obad."]);

const BOOKS = [
  { name: "Gen.", chapters: 50 }, { name: "Psa.", chapters: 150 }, { name: "Isa.", chapters: 66 },
  { name: "Lam.", chapters: 5 }, { name: "Ezek.", chapters: 48 }, { name: "Matt.", chapters: 28 },
  { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 }, { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 }, { name: "Rom.", chapters: 16 }, { name: "1 Cor.", chapters: 16 },
  { name: "2 Cor.", chapters: 13 }, { name: "Gal.", chapters: 6 }, { name: "Eph.", chapters: 6 },
  { name: "Phil.", chapters: 4 }, { name: "Col.", chapters: 4 }, { name: "1 Thes.", chapters: 5 },
  { name: "2 Thes.", chapters: 3 }, { name: "1 Tim.", chapters: 6 }, { name: "2 Tim.", chapters: 4 },
  { name: "Titus", chapters: 3 }, { name: "Philem.", chapters: 1 }, { name: "Heb.", chapters: 13 },
  { name: "James", chapters: 5 }, { name: "1 Pet.", chapters: 5 }, { name: "2 Pet.", chapters: 3 },
  { name: "1 John", chapters: 5 }, { name: "2 John", chapters: 1 }, { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 }, { name: "Rev.", chapters: 22 },
];

export function EditLessonModal({ visible, onClose, pathId, editingGroupIndex, editingGroup }: Props) {
  const [lessonTitle, setLessonTitle] = useState("");
  const [verses, setVerses] = useState<{ verseReference: string; verseText: string }[]>([]);
  const [injectToLibrary, setInjectToLibrary] = useState(true);

  // Initialize from editingGroup when opened
  React.useEffect(() => {
    if (visible) {
      if (editingGroup) {
        setLessonTitle(editingGroup.title);
        setVerses([...editingGroup.verses]);
        setInjectToLibrary(true);
      } else {
        setLessonTitle("");
        setVerses([]);
        setInjectToLibrary(true);
      }
      setEntryMode("BIBLE");
      setVerseText("");
      setCustomRef("");
      setSelectedBook(null);
      setSelectedChapter(null);
      setSelectedVerse(null);
      setPickerStep("book");
    }
  }, [visible, editingGroup]);

  // Verse Entry Mode
  const [entryMode, setEntryMode] = useState<"BIBLE" | "CUSTOM">("BIBLE");
  
  // Custom Excerpt State
  const [customRef, setCustomRef] = useState("");
  
  // Bible Picker State
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [pickerStep, setPickerStep] = useState<"book" | "chapter" | "verse" | "ready">("book");
  const [isFetchingVerse, setIsFetchingVerse] = useState(false);
  
  // Shared text
  const [verseText, setVerseText] = useState("");

  const bookInfo = useMemo(() => BOOKS.find((b) => b.name === selectedBook), [selectedBook]);
  const isSingleChapter = selectedBook ? SINGLE_CHAPTER_BOOKS.has(selectedBook) : false;

  const handleSelectBook = (name: string) => {
    setSelectedBook(name);
    setSelectedChapter(null);
    setSelectedVerse(null);
    setPickerStep(SINGLE_CHAPTER_BOOKS.has(name) ? "verse" : "chapter");
  };

  const handleSelectVerse = async (n: number) => {
    setSelectedVerse(n);
    setPickerStep("ready");
    
    let finalRef = "";
    if (isSingleChapter) {
      finalRef = `${selectedBook} ${n}`;
    } else {
      finalRef = `${selectedBook} ${selectedChapter}:${n}`;
    }

    setIsFetchingVerse(true);
    try {
      const { verses } = await fetchLessonVerses([finalRef]);
      const fetchedText = Object.values(verses)[0];
      if (fetchedText) {
        setVerseText(fetchedText);
      } else {
        progressStore.getState().showToast("Could not find text for this verse.");
      }
    } catch (e) {
      console.error("Failed to fetch verse:", e);
      progressStore.getState().showToast("Failed to fetch verse from LSM.");
    } finally {
      setIsFetchingVerse(false);
    }
  };

  const constructedBibleRef = useMemo(() => {
    if (!selectedBook) return "??? ?:?";
    if (isSingleChapter) {
      return selectedVerse !== null ? `${selectedBook} ${selectedVerse}` : `${selectedBook} ?`;
    }
    if (selectedChapter === null) return `${selectedBook} ?:?`;
    if (selectedVerse === null) return `${selectedBook} ${selectedChapter}:?`;
    return `${selectedBook} ${selectedChapter}:${selectedVerse}`;
  }, [selectedBook, selectedChapter, selectedVerse, isSingleChapter]);

  const handleAddVerse = () => {
    const finalRef = entryMode === "BIBLE" ? constructedBibleRef : customRef.trim();
    if (entryMode === "BIBLE" && pickerStep !== "ready") return;
    if (entryMode === "CUSTOM" && !finalRef) return;
    if (!verseText.trim()) return;

    setVerses([...verses, { verseReference: finalRef, verseText: verseText.trim() }]);
    
    // Reset inputs
    setVerseText("");
    setCustomRef("");
    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedVerse(null);
    setPickerStep("book");
  };

  const handleSave = () => {
    if (!lessonTitle.trim() || verses.length === 0) return;
    
    if (editingGroup !== undefined && editingGroupIndex !== undefined) {
      customPathStore.getState().updateLessonInPath(pathId, editingGroupIndex, {
        title: lessonTitle.trim(),
        verses
      }, injectToLibrary);
    } else {
      customPathStore.getState().addLessonToPath(pathId, {
        title: lessonTitle.trim(),
        verses
      }, injectToLibrary);
    }
    
    onClose();
  };

  const isAddDisabled = !verseText.trim() || (entryMode === "BIBLE" ? pickerStep !== "ready" : !customRef.trim());

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{editingGroup ? "Edit Lesson Stone" : "Add Lesson Stone"}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <FontAwesome5 name="times" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Lesson Title</Text>
            <TextInput style={styles.input} value={lessonTitle} onChangeText={setLessonTitle} placeholder="e.g. Session 1" placeholderTextColor="#94A3B8" />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Add verses to Daily Practice</Text>
              <Switch value={injectToLibrary} onValueChange={setInjectToLibrary} trackColor={{ false: "#E2E8F0", true: "#34C759" }} />
            </View>

            <View style={styles.divider} />

            {verses.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>Verses in Playlist ({verses.length})</Text>
                {verses.map((v, i) => (
                  <View key={i} style={styles.versePill}>
                    <Text style={styles.verseRef}>{v.verseReference}</Text>
                    <TouchableOpacity 
                      hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                      onPress={() => setVerses(verses.filter((_, idx) => idx !== i))}
                    >
                      <FontAwesome5 name="trash" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Add a Verse</Text>
            
            {/* Segmented Control */}
            <View style={styles.segmentControl}>
              <TouchableOpacity style={[styles.segmentBtn, entryMode === "BIBLE" && styles.segmentActive]} onPress={() => setEntryMode("BIBLE")}>
                <Text style={[styles.segmentText, entryMode === "BIBLE" && styles.segmentTextActive]}>Bible Verse</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentBtn, entryMode === "CUSTOM" && styles.segmentActive]} onPress={() => setEntryMode("CUSTOM")}>
                <Text style={[styles.segmentText, entryMode === "CUSTOM" && styles.segmentTextActive]}>Custom Excerpt</Text>
              </TouchableOpacity>
            </View>

            {entryMode === "BIBLE" ? (
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  {pickerStep !== "book" && (
                    <TouchableOpacity onPress={() => {
                      if (pickerStep === "ready") { setSelectedVerse(null); setPickerStep("verse"); }
                      else if (pickerStep === "verse") {
                        setSelectedVerse(null);
                        if (isSingleChapter) { setSelectedBook(null); setPickerStep("book"); }
                        else { setSelectedChapter(null); setPickerStep("chapter"); }
                      } else if (pickerStep === "chapter") { setSelectedBook(null); setSelectedChapter(null); setPickerStep("book"); }
                    }} style={{ paddingRight: 10 }}>
                      <Text style={{ color: "#3B82F6", fontWeight: "700" }}>← Back</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.constructedRef}>{constructedBibleRef}</Text>
                </View>
                
                <ScrollView nestedScrollEnabled style={styles.pickerScroll} contentContainerStyle={styles.pickerGrid}>
                  {pickerStep === "book" && BOOKS.map((b) => (
                    <TouchableOpacity key={b.name} style={styles.pickerItem} onPress={() => handleSelectBook(b.name)}>
                      <Text style={styles.pickerItemText}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {pickerStep === "chapter" && bookInfo && Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map((n) => (
                    <TouchableOpacity key={n} style={styles.pickerNum} onPress={() => { setSelectedChapter(n); setPickerStep("verse"); }}>
                      <Text style={styles.pickerNumText}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                  {pickerStep === "verse" && Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                    <TouchableOpacity key={n} style={styles.pickerNum} onPress={() => handleSelectVerse(n)}>
                      <Text style={styles.pickerNumText}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                  {pickerStep === "ready" && (
                    <View style={styles.readyBox}>
                      {isFetchingVerse ? (
                        <>
                          <ActivityIndicator size="large" color="#3B82F6" />
                          <Text style={styles.readyText}>Fetching Text...</Text>
                        </>
                      ) : (
                        <>
                          <FontAwesome5 name="check-circle" size={32} color="#34C759" />
                          <Text style={styles.readyText}>Reference Selected</Text>
                        </>
                      )}
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Custom Reference</Text>
                <TextInput style={styles.input} value={customRef} onChangeText={setCustomRef} placeholder="e.g. The Economy of God, pg. 45" placeholderTextColor="#94A3B8" />
              </View>
            )}

            <Text style={styles.label}>Verse Text</Text>
            <TextInput style={[styles.input, { height: 100 }]} value={verseText} onChangeText={setVerseText} placeholder="Type or paste the text here..." placeholderTextColor="#94A3B8" multiline textAlignVertical="top" />

            <TouchableOpacity style={[styles.addButton, isAddDisabled && styles.disabledBtn]} onPress={handleAddVerse} disabled={isAddDisabled}>
              <FontAwesome5 name="plus" size={14} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.addButtonText}>Add to Playlist</Text>
            </TouchableOpacity>

          </ScrollView>
          <TouchableOpacity style={[styles.saveButton, (!lessonTitle || verses.length === 0) && styles.disabledBtn]} onPress={handleSave} disabled={!lessonTitle || verses.length === 0}>
            <Text style={styles.saveButtonText}>Save Lesson</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
  },
  scroll: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1E293B",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 12,
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  segmentTextActive: {
    color: "#1E293B",
  },
  pickerContainer: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 180,
    overflow: "hidden",
    marginBottom: 8,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  constructedRef: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
    flex: 1,
    textAlign: "center",
  },
  pickerScroll: {
    flex: 1,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 8,
  },
  pickerItem: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  pickerNum: {
    width: 40,
    height: 40,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerNumText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  readyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
    width: "100%",
  },
  readyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
  },
  versePill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  verseRef: {
    fontWeight: "700",
    color: "#334155",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.5,
  }
});
