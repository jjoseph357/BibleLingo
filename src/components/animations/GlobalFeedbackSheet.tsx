import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, TouchableOpacity, View, Platform } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

interface Props {
  status: "idle" | "correct" | "incorrect";
  targetVerseText: string;
  xpEarned?: number;
  onContinue: () => void;
}

const SHEET_HEIGHT = 200;

export function GlobalFeedbackSheet({ status, targetVerseText, xpEarned = 10, onContinue }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isVisible = status !== "idle";

  useEffect(() => {
    if (!isVisible) {
      translateY.setValue(SHEET_HEIGHT);
      floatAnim.setValue(0);
      scaleAnim.setValue(0.4);
      opacityAnim.setValue(0);
      return;
    }

    // Slide up with bounce
    Animated.spring(translateY, {
      toValue: 0,
      friction: 7,
      tension: 100,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    if (status === "correct") {
      Animated.parallel([
        Animated.timing(floatAnim, {
          toValue: -320, // Float high up to the center of the screen
          duration: 2200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.0,
          friction: 4,
          tension: 50,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
          Animated.delay(1000), // Linger in the middle of the screen
          Animated.timing(opacityAnim, { toValue: 0, duration: 1000, useNativeDriver: Platform.OS !== 'web' })
        ])
      ]).start();
    }
  }, [isVisible, status]);

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
          <FontAwesome5 name={isCorrect ? "check-circle" : "times-circle"} size={28} color="#FFF" style={styles.emoji} solid />
          <Text style={styles.label}>{isCorrect ? "Correct!" : "Incorrect"}</Text>

          {/* Centered Floating XP Particle */}
          {isCorrect && (
            <Animated.View
              style={[
                styles.floatingXpContainer,
                {
                  opacity: opacityAnim,
                  transform: [
                    { translateY: floatAnim },
                    { scale: scaleAnim }
                  ]
                }
              ]}
            >
              <FontAwesome5 name="star" size={26} color="#FFD93D" solid style={{ marginRight: 8, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 }} />
              <Text style={styles.floatingXpText}>+{xpEarned} XP</Text>
            </Animated.View>
          )}
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
  floatingXpContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingXpText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFD93D',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 8,
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
