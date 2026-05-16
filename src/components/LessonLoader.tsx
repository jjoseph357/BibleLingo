// ============================================================
// LessonLoader — Skeleton Loading State
// ============================================================

import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

export function LessonLoader() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrap, { opacity }]}>
        <Text style={styles.icon}>📖</Text>
      </Animated.View>
      <Text style={styles.title}>Loading verses…</Text>
      <Text style={styles.subtitle}>
        Fetching the Recovery Version text from LSM
      </Text>

      {/* Skeleton word chips */}
      <View style={styles.skeletonRow}>
        {[80, 50, 70, 40, 90].map((w, i) => (
          <Animated.View
            key={i}
            style={[styles.skeletonChip, { width: w, opacity }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  iconWrap: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 32,
  },
  skeletonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  skeletonChip: {
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
  },
});
