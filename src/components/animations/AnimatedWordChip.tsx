// ============================================================
// AnimatedWordChip — Scale-pop on mount
// ============================================================
//
// When a word moves between lists (bank ↔ answer), React unmounts
// the old instance and mounts a new one. The mount triggers a
// spring scale from 0 → 1, giving the "pop into slot" effect.
// ============================================================

import React, { useEffect, useRef } from "react";
import {
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";

interface Props {
  text: string;
  onPress: () => void;
  chipStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export function AnimatedWordChip({ text, onPress, chipStyle, textStyle }: Props) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.chip, chipStyle]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, textStyle]}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
  },
});
