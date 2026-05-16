// ============================================================
// DevMenu — Development-Only Debug Overlay
// ============================================================
//
// Access: Rendered as a floating "🛠" button. Tap to expand.
// Safety: Returns null when __DEV__ is falsy (never ships to prod).
//
// Actions:
//   - Force Win       → marks active lesson complete with full score
//   - Unlock All      → sets every path node to "completed"
//   - Fast Forward    → subtracts N days from all SRS review dates
//   - Reset All Data  → clears all stores to initial state
// ============================================================

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";

import { lessonStore } from "../stores/lessonStore";
import { progressStore } from "../stores/progressStore";
import { pathStore } from "../stores/pathStore";

// ── Gate: never render in production ─────────────────────────

declare const __DEV__: boolean;

export function DevMenu() {
  if (typeof __DEV__ !== "undefined" && !__DEV__) return null;

  const [visible, setVisible] = useState(false);

  // ── Actions ──────────────────────────────────────────────

  const forceWin = () => {
    const { verses } = lessonStore.getState();
    lessonStore.setState({
      score: verses.length,
      isLessonComplete: true,
    });
    Alert.alert("Dev", `Lesson force-won (score: ${verses.length}/${verses.length}).`);
  };

  const unlockAll = () => {
    pathStore.getState().unlockAll();
    Alert.alert("Dev", "All path nodes unlocked.");
  };

  const fastForward = (days: number) => {
    progressStore.getState().fastForward(days);
    const count = progressStore.getState().entries.length;
    Alert.alert("Dev", `Fast-forwarded ${days}d on ${count} verse(s).`);
  };

  const resetAll = () => {
    Alert.alert("Reset All Data?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          lessonStore.getState().restartLesson();
          lessonStore.setState({ verses: [] });
          progressStore.getState().reset();
          pathStore.getState().reset();
          Alert.alert("Dev", "All data reset.");
        },
      },
    ]);
  };

  // ── Render ───────────────────────────────────────────────

  return (
    <>
      {/* Floating trigger button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>🛠</Text>
      </TouchableOpacity>

      {/* Overlay modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.title}>Dev Menu</Text>

            {/* Force Win */}
            <TouchableOpacity style={styles.btn} onPress={forceWin}>
              <Text style={styles.btnText}>⚡ Force Win Lesson</Text>
            </TouchableOpacity>

            {/* Unlock All */}
            <TouchableOpacity style={styles.btn} onPress={unlockAll}>
              <Text style={styles.btnText}>🔓 Unlock All Path Nodes</Text>
            </TouchableOpacity>

            {/* Fast Forward */}
            <Text style={styles.sectionLabel}>Fast Forward SRS</Text>
            <View style={styles.row}>
              {[1, 3, 7].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={styles.ffBtn}
                  onPress={() => fastForward(d)}
                >
                  <Text style={styles.ffBtnText}>+{d}d</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reset */}
            <TouchableOpacity
              style={[styles.btn, styles.dangerBtn]}
              onPress={resetAll}
            >
              <Text style={[styles.btnText, styles.dangerText]}>
                🗑 Reset All Data
              </Text>
            </TouchableOpacity>

            {/* Close */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 32,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 22,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  btn: {
    backgroundColor: "#2C2C2E",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  btnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  dangerBtn: {
    marginTop: 12,
    backgroundColor: "#3A1C1C",
  },
  dangerText: {
    color: "#FF453A",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  ffBtn: {
    flex: 1,
    backgroundColor: "#2C2C2E",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  ffBtnText: {
    color: "#64D2FF",
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  closeBtnText: {
    color: "#888",
    fontSize: 15,
  },
});
