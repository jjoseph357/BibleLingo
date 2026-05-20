// ============================================================
// TypeBlankQuestion — Bridge between Missing Link and Scribe
// ============================================================
//
// Renders the verse with randomly selected words replaced by
// inline TextInput fields. Uses flexWrap so blanks at line
// endings wrap naturally alongside the surrounding text.
// ============================================================

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { normalize } from "../utils/scribe";

interface TypeBlankQuestionProps {
  targetVerse: string;
  missingCount?: number;
  onSubmit?: (isCorrect: boolean) => void;
}

interface VersePart {
  word: string;       // Original word (with punctuation)
  isBlank: boolean;
  blankIndex: number;  // -1 if not a blank
}

/**
 * Split the verse into words, randomly select `missingCount` indices
 * to hide, and return the structured parts array.
 */
function buildParts(verse: string, missingCount: number): VersePart[] {
  const words = verse.split(/\s+/).filter(Boolean);
  const count = Math.min(missingCount, words.length);

  // Pick random unique indices
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * words.length));
  }

  // Sort blank indices so blankIndex assignment is sequential
  const sortedBlanks = [...indices].sort((a, b) => a - b);

  return words.map((word, i) => {
    const blankPos = sortedBlanks.indexOf(i);
    return {
      word,
      isBlank: blankPos !== -1,
      blankIndex: blankPos !== -1 ? blankPos : -1,
    };
  });
}

export function TypeBlankQuestion({
  targetVerse,
  missingCount = 3,
  onSubmit,
}: TypeBlankQuestionProps) {
  const parts = useMemo(
    () => buildParts(targetVerse, missingCount),
    [targetVerse, missingCount]
  );

  const blankCount = parts.filter((p) => p.isBlank).length;

  // State: one string per blank, keyed by blankIndex
  const [inputs, setInputs] = useState<string[]>(
    () => new Array(blankCount).fill("")
  );

  const updateInput = (blankIndex: number, value: string) => {
    setInputs((prev) => {
      const next = [...prev];
      next[blankIndex] = value;
      return next;
    });
  };

  const handleSubmit = () => {
    // Compare each input against its corresponding original word
    const isCorrect = parts
      .filter((p) => p.isBlank)
      .every((p) => normalize(inputs[p.blankIndex]) === normalize(p.word));

    onSubmit?.(isCorrect);
  };

  const isSubmitDisabled = inputs.some((v) => v.trim() === "");

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fill in the missing words:</Text>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sentenceBox}>
          {parts.map((part, i) => {
            if (part.isBlank) {
              return (
                <View key={`blank-${i}`} style={styles.inputWrapper}>
                  <TextInput
                    style={styles.blankInput}
                    value={inputs[part.blankIndex]}
                    onChangeText={(text) => updateInput(part.blankIndex, text)}
                    autoCorrect={false}
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="..."
                    placeholderTextColor="#BBB"
                  />
                </View>
              );
            }

            return (
              <Text key={`word-${i}`} style={styles.wordText}>
                {part.word}{" "}
              </Text>
            );
          })}
        </View>
      </ScrollView>

      {onSubmit && (
        <TouchableOpacity
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
        >
          <Text style={styles.submitText}>Check</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  wordText: {
    fontSize: 20,
    lineHeight: 40,
    color: "#333",
  },
  inputWrapper: {
    marginHorizontal: 2,
    marginVertical: 2,
  },
  blankInput: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4A90D9",
    backgroundColor: "#FFF",
    borderBottomWidth: 2,
    borderBottomColor: "#4A90D9",
    minWidth: 70,
    paddingHorizontal: 8,
    paddingVertical: 4,
    lineHeight: 28,
    textAlign: "center",
  },
  submitButton: {
    alignSelf: "center",
    backgroundColor: "#34C759",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
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
