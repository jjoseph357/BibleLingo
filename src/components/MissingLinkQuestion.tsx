import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { WordItem } from "../utils/scramble";
import { buildMissingLinkState, checkMissingLinkAnswer } from "../utils/missingLink";
import { AnimatedWordChip } from "./animations/AnimatedWordChip";

interface MissingLinkQuestionProps {
  targetVerse: string;
  decoyWords: string[];
  blankCount?: number;
  onSubmit?: (isCorrect: boolean) => void;
}

export function MissingLinkQuestion({
  targetVerse,
  decoyWords,
  blankCount,
  onSubmit,
}: MissingLinkQuestionProps) {
  // Initialize state once
  const { chunks, blankIndices, initialBank } = useMemo(
    () => buildMissingLinkState(targetVerse, decoyWords, blankCount),
    [targetVerse, decoyWords, blankCount]
  );

  const [bankWords, setBankWords] = useState<WordItem[]>(initialBank);
  const [filledBlanks, setFilledBlanks] = useState<(WordItem | null)[]>(
    new Array(blankIndices.length).fill(null)
  );

  const tapBankWord = (word: WordItem) => {
    // Find first empty slot
    const emptyIndex = filledBlanks.findIndex((w) => w === null);
    if (emptyIndex === -1) return; // No empty slots

    setBankWords((prev) => prev.filter((w) => w.id !== word.id));
    setFilledBlanks((prev) => {
      const next = [...prev];
      next[emptyIndex] = word;
      return next;
    });
  };

  const tapFilledBlank = (word: WordItem, index: number) => {
    setFilledBlanks((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setBankWords((prev) => [...prev, word]);
  };

  const handleSubmit = () => {
    const isCorrect = checkMissingLinkAnswer(filledBlanks, blankIndices, chunks);
    onSubmit?.(isCorrect);
  };

  const isSubmitDisabled = filledBlanks.some((w) => w === null);

  return (
    <View style={styles.container}>
      <View style={styles.sentenceBox}>
        {chunks.map((chunk, index) => {
          const blankSlotIndex = blankIndices.indexOf(index);
          const isBlank = blankSlotIndex !== -1;

          if (isBlank) {
            const filledWord = filledBlanks[blankSlotIndex];
            return (
              <TouchableOpacity
                key={`blank-${index}`}
                style={[styles.blankSlot, filledWord && styles.filledSlot]}
                onPress={() => filledWord && tapFilledBlank(filledWord, blankSlotIndex)}
                activeOpacity={filledWord ? 0.7 : 1}
              >
                <Text style={[styles.blankText, filledWord && styles.filledText]}>
                  {filledWord ? filledWord.text : "___"}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <Text key={`text-${index}`} style={styles.staticText}>
              {chunk}{" "}
            </Text>
          );
        })}
      </View>

      {onSubmit && (
        <TouchableOpacity
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
        >
          <Text style={styles.submitText}>Check</Text>
        </TouchableOpacity>
      )}

      <View style={styles.wordBank}>
        <Text style={styles.label}>Word Bank</Text>
        <View style={styles.wordRow}>
          {bankWords.map((word) => (
            <AnimatedWordChip
              key={word.id}
              text={word.text}
              onPress={() => tapBankWord(word)}
              chipStyle={styles.bankChip}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  sentenceBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
  },
  staticText: {
    fontSize: 22,
    lineHeight: 36,
    color: "#333",
  },
  blankSlot: {
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: "#999",
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  filledSlot: {
    backgroundColor: "#4A90D9",
    borderBottomWidth: 0,
    borderRadius: 8,
  },
  blankText: {
    fontSize: 22,
    lineHeight: 36,
    color: "#999",
  },
  filledText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  wordBank: {
    padding: 12,
    minHeight: 100,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  wordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bankChip: {
    backgroundColor: "#E8E8E8",
  },
  submitButton: {
    alignSelf: "center",
    backgroundColor: "#34C759",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  submitText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
