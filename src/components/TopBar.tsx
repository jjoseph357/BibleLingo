import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useStore } from "zustand";
import { progressStore, getLocalTodayString } from "../stores/progressStore";
import { FontAwesome5 } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { ShopModal } from "./ShopModal";

export function TopBar() {
  const { streakDays, lastPracticeDate, xp, crowns, xpBoostEndTime } = useStore(progressStore);
  const [isShopVisible, setIsShopVisible] = React.useState(false);
  const [boostTimeLeft, setBoostTimeLeft] = React.useState<string | null>(null);

  // Check if streak is active today (timezone/clock-skew robust check)
  const today = getLocalTodayString();
  const isStreakActiveToday = lastPracticeDate && lastPracticeDate >= today && streakDays > 0;

  // XP Boost Countdown Timer
  React.useEffect(() => {
    if (!xpBoostEndTime) {
      setBoostTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const diff = new Date(xpBoostEndTime).getTime() - new Date().getTime();
      if (diff <= 0) {
        setBoostTimeLeft(null);
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setBoostTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [xpBoostEndTime]);

  return (
    <View style={styles.container}>
      {/* Streak Indicator */}
      <View style={styles.badge}>
        <FontAwesome5
          name="fire"
          size={18}
          color={isStreakActiveToday ? "#FF9500" : "#A0A0A0"}
          style={styles.iconMargin}
        />
        <Text style={[styles.text, isStreakActiveToday ? styles.streakActive : styles.streakInactive]}>
          {streakDays}
        </Text>
      </View>

      {/* XP Boost Indicator */}
      {boostTimeLeft && (
        <View style={[styles.badge, styles.boostBadge]}>
          <FontAwesome5 name="bolt" size={14} color="#FFF" style={styles.iconMargin} />
          <Text style={styles.boostText}>2x XP: {boostTimeLeft}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Talents / XP Indicator */}
        <View style={[styles.badge, { marginRight: 8 }]}>
          <FontAwesome5 name="star" size={16} color="#4A90D9" style={styles.iconMargin} />
          <Text style={[styles.text, styles.xpText]}>{xp} XP</Text>
        </View>

        {/* Crowns & Shop Button */}
        <TouchableOpacity style={styles.shopButton} onPress={() => setIsShopVisible(true)}>
          <Text style={styles.shopText}>{crowns}</Text>
          <FontAwesome5 name="crown" size={16} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      <ShopModal visible={isShopVisible} onClose={() => setIsShopVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
  iconMargin: {
    marginRight: 6,
  },
  iconInactive: {
    opacity: 0.3,
  },
  text: {
    fontSize: 16,
    fontWeight: "800",
  },
  streakActive: {
    color: "#FF9500",
  },
  streakInactive: {
    color: "#A0A0A0",
  },
  xpText: {
    color: "#4A90D9",
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  shopText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  boostBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 10,
  },
  boostText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  }
});
