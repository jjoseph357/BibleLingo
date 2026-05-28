import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { VerseItem } from "../types/models";
import { generateDecoyReferences } from "../utils/navigatorDecoys";

interface NavigatorEasyQuestionProps {
  targetVerse: VerseItem;
  onSubmit?: (isCorrect: boolean) => void;
}

/** Shuffle an array in place (Fisher-Yates) and return it. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function NavigatorEasyQuestion({ targetVerse, onSubmit }: NavigatorEasyQuestionProps) {
  const options = useMemo(() => {
    const decoys = generateDecoyReferences(targetVerse.verseReference);
    return shuffle([targetVerse.verseReference, ...decoys]);
  }, [targetVerse.verseReference]);

  const [selected, setSelected] = useState<string | null>(null);

  const handleTap = (ref: string) => {
    if (selected !== null) return; // already answered
    setSelected(ref);
    const isCorrect = ref === targetVerse.verseReference;
    onSubmit?.(isCorrect);
  };

  const getButtonStyle = (ref: string) => {
    if (selected === null) return styles.optionButton;
    if (ref === targetVerse.verseReference) return [styles.optionButton, styles.correctButton];
    if (ref === selected) return [styles.optionButton, styles.wrongButton];
    return [styles.optionButton, styles.dimmedButton];
  };

  const getTextStyle = (ref: string) => {
    if (selected === null) return styles.optionText;
    if (ref === targetVerse.verseReference) return [styles.optionText, styles.correctText];
    if (ref === selected) return [styles.optionText, styles.wrongText];
    return [styles.optionText, styles.dimmedText];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Which verse is this?</Text>

      <View style={styles.verseCard}>
        <Text style={styles.verseText}>
          "{targetVerse.verseText}"
        </Text>
      </View>

      <View style={styles.grid}>
        {options.map((ref) => (
          <TouchableOpacity
            key={ref}
            style={getButtonStyle(ref)}
            onPress={() => handleTap(ref)}
            activeOpacity={selected !== null ? 1 : 0.7}
          >
            <Text style={getTextStyle(ref)}>{ref}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  verseCard: {
    backgroundColor: "#F9F9F9",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  verseText: {
    fontSize: 20,
    lineHeight: 30,
    color: "#333",
    textAlign: "center",
    fontStyle: "italic",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  optionButton: {
    width: "47%",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  correctButton: {
    backgroundColor: "#DCFCE7",
    borderColor: "#34C759",
  },
  wrongButton: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },
  dimmedButton: {
    opacity: 0.4,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  correctText: {
    color: "#166534",
  },
  wrongText: {
    color: "#991B1B",
  },
  dimmedText: {
    color: "#999",
  },
});
