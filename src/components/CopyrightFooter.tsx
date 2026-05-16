// ============================================================
// CopyrightFooter — LSM Copyright Attribution
// ============================================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  text: string;
}

export function CopyrightFooter({ text }: Props) {
  if (!text) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  text: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    lineHeight: 16,
  },
});
