import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useStore } from 'zustand';
import { progressStore } from '../stores/progressStore';

const FAKE_USERS = [
  { id: 'f1', name: 'FaithfulRunner', xp: 850 },
  { id: 'f2', name: 'GraceSeeker', xp: 420 },
  { id: 'f3', name: 'HolySpiritFire', xp: 950 },
  { id: 'f4', name: 'ZionBound', xp: 300 },
  { id: 'f5', name: 'NewJerusalem', xp: 700 },
  { id: 'f6', name: 'Overcomer', xp: 620 },
  { id: 'f7', name: 'AgapeLove', xp: 550 },
  { id: 'f8', name: 'LivingWater', xp: 800 },
  { id: 'f9', name: 'BreadOfLife', xp: 480 },
  { id: 'f10', name: 'MorningStar', xp: 390 },
  { id: 'f11', name: 'Lampstand', xp: 600 },
  { id: 'f12', name: 'TreeOfLife', xp: 710 },
  { id: 'f13', name: 'RiverOfWater', xp: 450 },
  { id: 'f14', name: 'HiddenManna', xp: 290 },
  { id: 'f15', name: 'WhiteStone', xp: 330 },
  { id: 'f16', name: 'MorningRevival', xp: 510 },
  { id: 'f17', name: 'GoodLand', xp: 670 },
  { id: 'f18', name: 'EconomyOfGod', xp: 890 },
  { id: 'f19', name: 'LocalChurch', xp: 410 },
  { id: 'f20', name: 'BodyOfChrist', xp: 760 },
  { id: 'f21', name: 'TriuneGod', xp: 540 },
  { id: 'f22', name: 'DivineLife', xp: 630 },
  { id: 'f23', name: 'Dispensing', xp: 380 },
  { id: 'f24', name: 'Transformation', xp: 250 },
  { id: 'f25', name: 'Mingling', xp: 490 },
  { id: 'f26', name: 'BuildingUp', xp: 570 },
  { id: 'f27', name: 'OneAccord', xp: 310 },
  { id: 'f28', name: 'NewCreation', xp: 430 },
  { id: 'f29', name: 'Redeemed', xp: 660 },
];

export function LeagueScreen() {
  const xp = useStore(progressStore, s => s.xp);

  const leaderboard = useMemo(() => {
    const combined = [
      ...FAKE_USERS,
      { id: 'me', name: 'You', xp: xp, isMe: true }
    ];
    combined.sort((a, b) => b.xp - a.xp);
    return combined;
  }, [xp]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bronze League</Text>
      <Text style={styles.subtitle}>Top 10 advance to Silver</Text>

      <FlatList
        data={leaderboard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const rank = index + 1;
          const isPromotionZone = rank <= 10;
          
          return (
            <View style={[
              styles.row,
              item.isMe && styles.myRow,
              isPromotionZone && styles.promotionRow
            ]}>
              <View style={styles.rankContainer}>
                <Text style={[styles.rankText, item.isMe && styles.myText]}>{rank}</Text>
              </View>
              <Text style={[styles.nameText, item.isMe && styles.myText]}>{item.name}</Text>
              <Text style={[styles.xpText, item.isMe && styles.myText]}>{item.xp} XP</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  promotionRow: {
    borderLeftWidth: 6,
    borderLeftColor: '#34C759',
  },
  myRow: {
    backgroundColor: '#E3F2FD',
    borderColor: '#BBDEFB',
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#777',
  },
  nameText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  xpText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5A623',
  },
  myText: {
    color: '#1565C0',
    fontWeight: '800',
  },
});
