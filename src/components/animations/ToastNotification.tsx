import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, Platform, View } from "react-native";
import { useStore } from "zustand";
import { progressStore } from "../../stores/progressStore";
import { FontAwesome5 } from "@expo/vector-icons";

export function ToastNotification() {
  const toastMessage = useStore(progressStore, (state) => state.toastMessage);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (toastMessage) {
      // Scale pop & Slide in together
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: Platform.OS === "ios" ? 50 : 20, // below status bar
          useNativeDriver: Platform.OS !== 'web',
          bounciness: 12,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.0,
          useNativeDriver: Platform.OS !== 'web',
          friction: 4,
          tension: 40,
        })
      ]).start();
    } else {
      // Slide out & scale down
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -150,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        })
      ]).start();
    }
  }, [toastMessage, slideAnim, scaleAnim]);

  if (!toastMessage) return null;

  // Determine styles and icons based on message content for maximum "juiciness"
  const isXp = toastMessage.includes("XP");
  const isCrown = toastMessage.includes("Crown");
  const isHighFive = toastMessage.includes("High-Five");

  let iconName = "info-circle";
  let iconColor = "#FFF";
  let bgStyle = styles.defaultBg;

  if (isXp) {
    iconName = "star";
    bgStyle = styles.xpBg;
  } else if (isCrown) {
    iconName = "crown";
    bgStyle = styles.crownBg;
  } else if (isHighFive) {
    iconName = "hand-paper";
    bgStyle = styles.highFiveBg;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        bgStyle,
        { 
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ] 
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.toastContent}>
        <FontAwesome5 name={iconName} size={18} color={iconColor} style={styles.icon} />
        <Text style={styles.text}>{toastMessage}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  // Rich "juicy" color palettes
  defaultBg: {
    backgroundColor: "#4CAF50", // Vibrant Green
  },
  xpBg: {
    backgroundColor: "#FF9500", // Rich Gold Orange
    borderWidth: 1.5,
    borderColor: "#FFCC00",
  },
  crownBg: {
    backgroundColor: "#F5A623", // Gold Crown Amber
    borderWidth: 1.5,
    borderColor: "#FFF3C4",
  },
  highFiveBg: {
    backgroundColor: "#2F80ED", // Premium Social Blue
    borderWidth: 1.5,
    borderColor: "#8ec5fc",
  },
});
