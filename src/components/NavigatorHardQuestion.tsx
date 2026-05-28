import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { VerseItem } from "../types/models";

// ── Book catalog (abbreviated names matching our data format) ─

interface BookEntry {
  name: string;
  chapters: number;
}

const SINGLE_CHAPTER_BOOKS = new Set(["Philem.", "2 John", "3 John", "Jude", "Obad."]);

const BOOKS: BookEntry[] = [
  // OT highlights
  { name: "Gen.", chapters: 50 },
  { name: "Psa.", chapters: 150 },
  { name: "Isa.", chapters: 66 },
  { name: "Lam.", chapters: 5 },
  { name: "Ezek.", chapters: 48 },
  // NT
  { name: "Matt.", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Rom.", chapters: 16 },
  { name: "1 Cor.", chapters: 16 },
  { name: "2 Cor.", chapters: 13 },
  { name: "Gal.", chapters: 6 },
  { name: "Eph.", chapters: 6 },
  { name: "Phil.", chapters: 4 },
  { name: "Col.", chapters: 4 },
  { name: "1 Thes.", chapters: 5 },
  { name: "2 Thes.", chapters: 3 },
  { name: "1 Tim.", chapters: 6 },
  { name: "2 Tim.", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philem.", chapters: 1 },
  { name: "Heb.", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Pet.", chapters: 5 },
  { name: "2 Pet.", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Rev.", chapters: 22 },
];

const MAX_VERSE = 50;

// ── Component ────────────────────────────────────────────────

interface NavigatorHardQuestionProps {
  targetVerse: VerseItem;
  onSubmit?: (isCorrect: boolean) => void;
}

type Step = "book" | "chapter" | "verse" | "ready";

export function NavigatorHardQuestion({
  targetVerse,
  onSubmit,
}: NavigatorHardQuestionProps) {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("book");

  const bookInfo = useMemo(
    () => BOOKS.find((b) => b.name === selectedBook),
    [selectedBook]
  );
  const isSingleChapter = selectedBook
    ? SINGLE_CHAPTER_BOOKS.has(selectedBook)
    : false;

  // Build the display reference as the user progresses
  const constructedRef = useMemo(() => {
    if (!selectedBook) return "??? ?:?";
    if (isSingleChapter) {
      return selectedVerse !== null
        ? `${selectedBook} ${selectedVerse}`
        : `${selectedBook} ?`;
    }
    if (selectedChapter === null) return `${selectedBook} ?:?`;
    if (selectedVerse === null) return `${selectedBook} ${selectedChapter}:?`;
    return `${selectedBook} ${selectedChapter}:${selectedVerse}`;
  }, [selectedBook, selectedChapter, selectedVerse, isSingleChapter]);

  // ── Handlers ─────────────────────────────────────────────

  const handleSelectBook = (name: string) => {
    setSelectedBook(name);
    setSelectedChapter(null);
    setSelectedVerse(null);
    // Single-chapter books skip straight to verse selection
    setStep(SINGLE_CHAPTER_BOOKS.has(name) ? "verse" : "chapter");
  };

  const handleSelectChapter = (ch: number) => {
    setSelectedChapter(ch);
    setSelectedVerse(null);
    setStep("verse");
  };

  const handleSelectVerse = (v: number) => {
    setSelectedVerse(v);
    setStep("ready");
  };

  const handleBack = () => {
    if (step === "ready") {
      setSelectedVerse(null);
      setStep("verse");
    } else if (step === "verse") {
      setSelectedVerse(null);
      if (isSingleChapter) {
        setSelectedBook(null);
        setStep("book");
      } else {
        setSelectedChapter(null);
        setStep("chapter");
      }
    } else if (step === "chapter") {
      setSelectedBook(null);
      setSelectedChapter(null);
      setStep("book");
    }
  };

  const handleCheck = () => {
    const isCorrect = constructedRef === targetVerse.verseReference;
    onSubmit?.(isCorrect);
  };

  // ── Step label ───────────────────────────────────────────

  const stepLabel =
    step === "book"
      ? "Step 1 — Select Book"
      : step === "chapter"
      ? "Step 2 — Select Chapter"
      : step === "verse"
      ? `Step ${isSingleChapter ? 2 : 3} — Select Verse`
      : "Ready — Check your answer!";

  // ── Render ───────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Verse text */}
      <View style={styles.verseCard}>
        <Text style={styles.verseText}>"{targetVerse.verseText}"</Text>
      </View>

      {/* Constructed reference */}
      <Text style={styles.refDisplay}>{constructedRef}</Text>

      {/* Step indicator + back button */}
      <View style={styles.stepRow}>
        {step !== "book" && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.stepLabel}>{stepLabel}</Text>
      </View>

      {/* Selection area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {step === "book" && (
          <View style={styles.bookGrid}>
            {BOOKS.map((b) => (
              <TouchableOpacity
                key={b.name}
                style={styles.bookChip}
                onPress={() => handleSelectBook(b.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.bookChipText}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === "chapter" && bookInfo && (
          <View style={styles.numberGrid}>
            {Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map(
              (n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.numberButton}
                  onPress={() => handleSelectChapter(n)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.numberText}>{n}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}

        {step === "verse" && (
          <View style={styles.numberGrid}>
            {Array.from({ length: MAX_VERSE }, (_, i) => i + 1).map((n) => (
              <TouchableOpacity
                key={n}
                style={styles.numberButton}
                onPress={() => handleSelectVerse(n)}
                activeOpacity={0.7}
              >
                <Text style={styles.numberText}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Check Answer button */}
      {step === "ready" && (
        <TouchableOpacity
          style={styles.checkButton}
          onPress={handleCheck}
          activeOpacity={0.8}
        >
          <Text style={styles.checkButtonText}>Check Answer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  verseCard: {
    backgroundColor: "#F9F9F9",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  verseText: {
    fontSize: 18,
    lineHeight: 26,
    color: "#333",
    textAlign: "center",
    fontStyle: "italic",
  },
  refDisplay: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4A90D9",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 32,
  },
  backButton: {
    paddingRight: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A90D9",
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  bookGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bookChip: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#D0D5DD",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bookChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  numberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  numberButton: {
    width: 48,
    height: 48,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  checkButton: {
    backgroundColor: "#34C759",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  checkButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
