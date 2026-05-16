// ============================================================
// OfflineError — Connectivity Error Screen
// ============================================================

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  message: string;
  onRetry?: () => void;
}

export function OfflineError({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.title}>Unable to Load Verses</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.hint}>
        BibleLingo requires an internet connection to display verse text.
      </Text>
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
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: "#4A90D9",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginBottom: 24,
  },
  retryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  hint: {
    fontSize: 12,
    color: "#AAA",
    textAlign: "center",
  },
});
