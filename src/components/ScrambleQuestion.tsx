// ============================================================
// ScrambleQuestion Component
// ============================================================
//
// Internal state:
//   - bankWords:   WordItem[] — shuffled words available to tap
//   - answerWords: WordItem[] — words placed in the answer area
//
// Interactions:
//   - Tap a bank word   → moves it to the answer box (appended)
//   - Tap an answer word → returns it to the bank
// ============================================================

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  WordItem,
  buildWordBank,
  checkOrder,
} from "../utils/scramble";
import { AnimatedWordChip } from "./animations/AnimatedWordChip";

interface ScrambleQuestionProps {
  targetVerse: string;
  decoyWords: string[];
  onSubmit?: (isCorrect: boolean) => void;
}

export function ScrambleQuestion({
  targetVerse,
  decoyWords,
  onSubmit,
}: ScrambleQuestionProps) {
  const [bankWords, setBankWords] = useState<WordItem[]>(() =>
    buildWordBank(targetVerse, decoyWords)
  );
  const [answerWords, setAnswerWords] = useState<WordItem[]>([]);

  const tapBankWord = (word: WordItem) => {
    setBankWords((prev) => prev.filter((w) => w.id !== word.id));
    setAnswerWords((prev) => [...prev, word]);
  };

  const tapAnswerWord = (word: WordItem) => {
    setAnswerWords((prev) => prev.filter((w) => w.id !== word.id));
    setBankWords((prev) => [...prev, word]);
  };

  const handleSubmit = () => {
    const isCorrect = checkOrder(answerWords, targetVerse);
    onSubmit?.(isCorrect);
  };

  return (
    <View style={styles.container}>
      {/* Answer Box */}
      <View style={styles.answerBox}>
        <Text style={styles.label}>Your Answer</Text>
        <View style={styles.wordRow}>
          {answerWords.map((word) => (
            <AnimatedWordChip
              key={word.id}
              text={word.text}
              onPress={() => tapAnswerWord(word)}
              chipStyle={styles.answerChip}
            />
          ))}
        </View>
      </View>

      {/* Submit Button */}
      {onSubmit && (
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Check</Text>
        </TouchableOpacity>
      )}

      {/* Word Bank */}
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
  answerBox: {
    minHeight: 120,
    borderWidth: 2,
    borderColor: "#4A90D9",
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 12,
  },
  wordBank: {
    padding: 12,
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
  answerChip: {
    backgroundColor: "#4A90D9",
  },
  bankChip: {
    backgroundColor: "#E8E8E8",
  },
  submitButton: {
    alignSelf: "center",
    backgroundColor: "#34C759",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  submitText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
