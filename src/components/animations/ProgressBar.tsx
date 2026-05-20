import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

interface ProgressBarProps {
  progress: number; // 0.0 to 1.0
  color?: string;
  height?: number;
}

export function ProgressBar({
  progress,
  color = "#34C759", // Default green
  height = 8,
}: ProgressBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  // Clamp progress between 0 and 1
  const safeProgress = Math.min(Math.max(progress, 0), 1);

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: safeProgress,
      useNativeDriver: false, // width cannot use native driver
      bounciness: 0,
      speed: 12,
    }).start();
  }, [safeProgress, animatedWidth]);

  return (
    <View style={[styles.track, { height }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 8,
  },
});
