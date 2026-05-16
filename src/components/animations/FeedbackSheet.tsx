// ============================================================
// FeedbackSheet — Slide-up Correct/Incorrect Banner
// ============================================================
//
// Slides up from the bottom with a spring bounce.
// Green for correct, muted red for incorrect.
// Auto-dismisses after 1.5 seconds.
// ============================================================

import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";

interface Props {
  visible: boolean;
  correct: boolean;
  onDismiss?: () => void;
}

const SHEET_HEIGHT = 140;

export function FeedbackSheet({ visible, correct, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (!visible) {
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

    // Auto-dismiss after 1.5s
    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onDismiss?.());
    }, 1500);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: correct ? "#34C759" : "#FF3B30",
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.emoji}>{correct ? "🎉" : "😔"}</Text>
      <Text style={styles.label}>{correct ? "Correct!" : "Incorrect"}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  label: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
  },
});
