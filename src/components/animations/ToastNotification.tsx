import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, Platform, SafeAreaView } from "react-native";
import { useStore } from "zustand";
import { progressStore } from "../../stores/progressStore";

export function ToastNotification() {
  const toastMessage = useStore(progressStore, (state) => state.toastMessage);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (toastMessage) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: Platform.OS === "ios" ? 50 : 20, // push down below status bar
        useNativeDriver: true,
        bounciness: 12,
      }).start();
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [toastMessage, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="none" // let touches pass through
    >
      <Text style={styles.text}>{toastMessage}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: "#4CAF50", // Vibrant Green
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
