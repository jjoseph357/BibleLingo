import React, { useEffect, useRef, useState } from "react";
import { Animated, View, Text, StyleSheet, TouchableOpacity, Modal, Easing } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ChestAnimationModal({ visible, onClose }: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const flareRotate = useRef(new Animated.Value(0)).current;
  const flareScale = useRef(new Animated.Value(0)).current;
  const lootFloat = useRef(new Animated.Value(0)).current;
  const lootOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<"shake" | "open" | "loot" | "done">("shake");

  useEffect(() => {
    if (!visible) {
      // Reset all values
      shakeAnim.setValue(0);
      scaleAnim.setValue(0.6);
      flareRotate.setValue(0);
      flareScale.setValue(0);
      lootFloat.setValue(0);
      lootOpacity.setValue(0);
      textScale.setValue(0);
      buttonOpacity.setValue(0);
      setPhase("shake");
      return;
    }

    // Phase 1: Chest appears and shakes (anticipation)
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    const shakeSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        Animated.delay(200),
      ]),
      { iterations: 3 }
    );

    shakeSequence.start(() => {
      // Phase 2: Light burst + open
      setPhase("open");

      Animated.parallel([
        // Flare scales up
        Animated.timing(flareScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        // Flare rotates
        Animated.loop(
          Animated.timing(flareRotate, {
            toValue: 1,
            duration: 4000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ),
      ]).start();

      // Phase 3: Loot dispenses after a short delay
      setTimeout(() => {
        setPhase("loot");

        Animated.parallel([
          // Crown floats upward
          Animated.timing(lootFloat, {
            toValue: -80,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Crown fades in
          Animated.timing(lootOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          // Reward text bounces in
          Animated.spring(textScale, {
            toValue: 1,
            friction: 4,
            tension: 60,
            delay: 600,
            useNativeDriver: true,
          }),
          // Button fades in
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 400,
            delay: 1200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setPhase("done");
        });
      }, 500);
    });
  }, [visible]);

  const flareRotateInterp = flareRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Light Flare */}
        <Animated.View
          style={[
            styles.flare,
            {
              transform: [
                { rotate: flareRotateInterp },
                { scale: flareScale },
              ],
              opacity: flareScale,
            },
          ]}
        >
          {[0, 45, 90, 135].map((deg) => (
            <View
              key={deg}
              style={[
                styles.flareBeam,
                { transform: [{ rotate: `${deg}deg` }] },
              ]}
            />
          ))}
        </Animated.View>

        {/* Chest Icon */}
        <Animated.View
          style={{
            transform: [
              { translateX: shakeAnim },
              { scale: scaleAnim },
            ],
          }}
        >
          <View style={styles.chestCircle}>
            <FontAwesome5
              name={phase === "shake" ? "box" : "box-open"}
              size={64}
              color={phase === "shake" ? "#F5A623" : "#FFD700"}
            />
          </View>
        </Animated.View>

        {/* Floating Loot Crown */}
        <Animated.View
          style={[
            styles.lootContainer,
            {
              transform: [{ translateY: lootFloat }],
              opacity: lootOpacity,
            },
          ]}
        >
          <FontAwesome5 name="crown" size={40} color="#FFD700" />
        </Animated.View>

        {/* Reward Text */}
        <Animated.View
          style={{
            transform: [{ scale: textScale }],
            marginTop: 30,
          }}
        >
          <Text style={styles.rewardTitle}>Daily Chest Opened!</Text>
          <Text style={styles.rewardAmount}>+25 Crowns</Text>
        </Animated.View>

        {/* Claim Button */}
        <Animated.View style={{ opacity: buttonOpacity, marginTop: 40 }}>
          <TouchableOpacity style={styles.claimButton} onPress={onClose}>
            <FontAwesome5 name="check" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.claimText}>Claim & Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  flare: {
    position: "absolute",
    width: 300,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  flareBeam: {
    position: "absolute",
    width: 4,
    height: 300,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 2,
  },
  chestCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(245, 166, 35, 0.3)",
  },
  lootContainer: {
    position: "absolute",
    top: "42%",
  },
  rewardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "center",
    textShadowColor: "rgba(255,215,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  rewardAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFD700",
    textAlign: "center",
    marginTop: 8,
    textShadowColor: "rgba(255,215,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5A623",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 28,
    shadowColor: "#F5A623",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  claimText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
  },
});
