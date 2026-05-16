import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, TouchableOpacity, View } from "react-native";

interface Props {
  status: "idle" | "correct" | "incorrect";
  targetVerseText: string;
  onContinue: () => void;
}

const SHEET_HEIGHT = 200;

export function GlobalFeedbackSheet({ status, targetVerseText, onContinue }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const isVisible = status !== "idle";

  useEffect(() => {
    if (!isVisible) {
      translateY.setValue(SHEET_HEIGHT);
      return;
    }

    // Slide up with bounce
    Animated.spring(translateY, {
      toValue: 0,
      friction: 7,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  if (!isVisible) return null;

  const isCorrect = status === "correct";

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: isCorrect ? "#34C759" : "#FF3B30",
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.emoji}>{isCorrect ? "🎉" : "😔"}</Text>
          <Text style={styles.label}>{isCorrect ? "Correct!" : "Incorrect"}</Text>
        </View>

        {!isCorrect && (
          <View style={styles.correctionBox}>
            <Text style={styles.correctionLabel}>Correct Answer:</Text>
            <Text style={styles.correctionText}>{targetVerseText}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, isCorrect ? styles.buttonCorrect : styles.buttonIncorrect]}
        onPress={onContinue}
      >
        <Text style={[styles.buttonText, !isCorrect && styles.buttonTextIncorrect]}>
          {isCorrect ? "Continue" : "Got it"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    justifyContent: "space-between",
  },
  content: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
    marginRight: 8,
  },
  label: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
  },
  correctionBox: {
    backgroundColor: "rgba(0,0,0,0.1)",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  correctionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  correctionText: {
    fontSize: 18,
    color: "#FFF",
    lineHeight: 26,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonCorrect: {
    backgroundColor: "#FFF",
  },
  buttonIncorrect: {
    backgroundColor: "#FFF",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "800",
  },
  buttonTextIncorrect: {
    color: "#FF3B30",
  },
});
