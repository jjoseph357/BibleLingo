import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { useStore } from 'zustand';
import { progressStore } from '../stores/progressStore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { 
  collection, query, orderBy, limit, getDocs, where, 
  startAfter, endBefore, limitToLast, getCountFromServer, 
  QueryDocumentSnapshot, DocumentData,
  addDoc, Timestamp, doc, setDoc, getFirestore
} from 'firebase/firestore';
import { FontAwesome5 } from '@expo/vector-icons';


interface UserData {
  id: string;
  name: string;
  xp: number;
  weeklyXp: number;
  streakDays: number;
  isMe?: boolean;
}

type TabType = 'ALL_TIME' | 'WEEKLY';
type FetchAction = 'TOP' | 'BOTTOM' | 'ME' | 'NEXT' | 'PREV' | 'SEARCH' | 'REFRESH';

export function LeagueScreen() {
  const username = useStore(progressStore, s => s.username);
  const localXp = useStore(progressStore, s => s.xp);
  const localWeeklyXp = useStore(progressStore, s => s.weeklyXp);
  const localStreak = useStore(progressStore, s => s.streakDays);
  
  const localLeagueTier = useStore(progressStore, s => s.leagueTier) || 'Bronze';
  
  const [leaderboard, setLeaderboard] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<TabType>('ALL_TIME');
  const [searchQuery, setSearchQuery] = useState('');
  
  // High-Five tracking: which users we've sent to today
  const [sentToday, setSentToday] = useState<Set<string>>(new Set());
  const [highFiveCooldown, setHighFiveCooldown] = useState(false);
  
  // Advanced Pagination State
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [pageOffset, setPageOffset] = useState(0);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // League Timer
  const [timeToClose, setTimeToClose] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      // Calculate next Sunday midnight
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      if (now.getDay() === 0 && now.getHours() > 0) {
        nextSunday.setDate(nextSunday.getDate() + 7);
      }
      nextSunday.setHours(0, 0, 0, 0);

      const diff = nextSunday.getTime() - now.getTime();
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      setTimeToClose(`${d}d ${h}h ${m}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetadata = useCallback(async () => {
    if (!isFirebaseConfigured || !db || !username) return;
    try {
      const usersRef = collection(db, 'users');
      // Total count in current league
      const totalQuery = query(usersRef, where('leagueTier', '==', localLeagueTier));
      const totalSnapshot = await getCountFromServer(totalQuery);
      setTotalPlayers(totalSnapshot.data().count);

      // My rank (count users strictly greater than me in active tab and same league)
      const orderField = activeTab === 'ALL_TIME' ? 'xp' : 'weeklyXp';
      const myVal = activeTab === 'ALL_TIME' ? localXp : localWeeklyXp;
      
      const rankQuery = query(
        usersRef, 
        where('leagueTier', '==', localLeagueTier),
        where(orderField, '>', myVal)
      );
      const rankSnapshot = await getCountFromServer(rankQuery);
      setMyRank(rankSnapshot.data().count + 1);
    } catch (err) {
      console.error("Failed to fetch metadata", err);
    }
  }, [activeTab, localXp, localWeeklyXp, username, localLeagueTier]);

  const fetchLeaderboard = async (action: FetchAction = 'REFRESH') => {
    try {
      setLoading(true);

      if (!isFirebaseConfigured || !db) {
        const data: UserData[] = [];
        if (username) {
          data.push({ id: 'me', name: username, xp: localXp, weeklyXp: localWeeklyXp, streakDays: localStreak, isMe: true });
        }
        setLeaderboard(data);
        return;
      }

      const usersRef = collection(db, 'users');
      const orderField = activeTab === 'ALL_TIME' ? 'xp' : 'weeklyXp';
      let q;
      let newOffset = pageOffset;
      let isBottom = false;

      // 1. Search Query override
      if (searchQuery.trim().length > 0) {
        const searchLower = searchQuery.trim().toLowerCase();
        q = query(
          usersRef,
          where('usernameLower', '>=', searchLower),
          where('usernameLower', '<=', searchLower + '\uf8ff'),
          limit(50)
        );
        newOffset = 0; 
      } 
      // 2. Pagination Actions
      else {
        if (action === 'TOP' || action === 'REFRESH') {
          q = query(usersRef, where('leagueTier', '==', localLeagueTier), orderBy(orderField, 'desc'), limit(50));
          newOffset = 0;
        } 
        else if (action === 'BOTTOM') {
          q = query(usersRef, where('leagueTier', '==', localLeagueTier), orderBy(orderField, 'asc'), limit(50));
          isBottom = true;
        } 
        else if (action === 'NEXT' && lastVisible) {
          q = query(usersRef, where('leagueTier', '==', localLeagueTier), orderBy(orderField, 'desc'), startAfter(lastVisible), limit(50));
          newOffset += 50;
        } 
        else if (action === 'PREV' && firstVisible) {
          q = query(usersRef, where('leagueTier', '==', localLeagueTier), orderBy(orderField, 'desc'), endBefore(firstVisible), limitToLast(50));
          newOffset = Math.max(0, newOffset - 50);
        } 
        else if (action === 'ME') {
          const myVal = activeTab === 'ALL_TIME' ? localXp : localWeeklyXp;
          q = query(usersRef, where('leagueTier', '==', localLeagueTier), where(orderField, '<=', myVal), orderBy(orderField, 'desc'), limit(50));
          newOffset = myRank ? Math.max(0, myRank - 1) : 0;
        }
      }

      const snapshot = await getDocs(q!);
      
      let docs = snapshot.docs;
      
      // If jumping to bottom, we ordered ASC, so reverse it in memory to display DESC properly
      if (isBottom) {
        docs.reverse();
        if (totalPlayers) {
          newOffset = Math.max(0, totalPlayers - docs.length);
        }
      }

      if (docs.length > 0) {
        setFirstVisible(docs[0]);
        setLastVisible(docs[docs.length - 1]);
      } else if (action === 'NEXT') {
        // Prevent going into an empty page
        setLoading(false);
        return; 
      }

      setPageOffset(newOffset);

      const data: UserData[] = [];
      docs.forEach(doc => {
        const d = doc.data();
        const isMe = d.username.toLowerCase() === username?.toLowerCase();
        data.push({
          id: doc.id,
          name: d.username,
          xp: d.xp || 0,
          weeklyXp: d.weeklyXp || 0,
          streakDays: d.streakDays || 0,
          isMe
        });
      });

      setLeaderboard(data);
    } catch (err) {
      console.error("Error fetching leaderboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLeaderboard(searchQuery.trim().length > 0 ? 'SEARCH' : 'TOP');
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [activeTab, searchQuery]);

  const getZoneType = (rank: number | null, total: number) => {
    if (rank === null || total === 0) return 'NONE';
    const zoneSize = total >= 15 ? 5 : total >= 6 ? 3 : 1;
    if (rank <= zoneSize) return 'PROMOTION';
    if (rank > total - zoneSize) return 'DEMOTION';
    return 'NONE';
  };

  const sendHighFive = async (recipientName: string) => {
    if (!username || !isFirebaseConfigured || !db) return;
    const recipientLower = recipientName.toLowerCase();
    if (sentToday.has(recipientLower)) return;

    // UI cooldown to prevent double-taps
    setHighFiveCooldown(true);
    setTimeout(() => setHighFiveCooldown(false), 2000);

    try {
      // Write to recipient's highFives subcollection
      const hfRef = collection(db, 'users', recipientLower, 'highFives');
      await addDoc(hfRef, {
        from: username,
        timestamp: new Date().toISOString(),
        seen: false,
      });

      // Track locally so we can't send again
      setSentToday(prev => new Set(prev).add(recipientLower));

      // Award sender +1 crown (capped at 10/day in addHighFiveCrown)
      const awarded = progressStore.getState().addHighFiveCrown();
      if (awarded) {
        progressStore.getState().showToast(`You sent a High-Five to ${recipientName}! +1 Crown`);
      } else {
        progressStore.getState().showToast(`High-Five sent to ${recipientName}! (Daily crown cap reached)`);
      }
    } catch (err) {
      console.error("Failed to send high-five:", err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{localLeagueTier} League</Text>
        <Text style={styles.subtitle}>
          Climb the ranks by earning XP. League closes in: {timeToClose}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'ALL_TIME' && styles.tabActive]}
          onPress={() => { setActiveTab('ALL_TIME'); setSearchQuery(''); }}
        >
          <Text style={[styles.tabText, activeTab === 'ALL_TIME' && styles.tabTextActive]}>All-Time</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'WEEKLY' && styles.tabActive]}
          onPress={() => { setActiveTab('WEEKLY'); setSearchQuery(''); }}
        >
          <Text style={[styles.tabText, activeTab === 'WEEKLY' && styles.tabTextActive]}>Weekly</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metaContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search players..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <FontAwesome5 name="times-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>Fetching real-time rankings...</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const isSearch = searchQuery.trim().length > 0;
            const rank = isSearch ? null : pageOffset + index + 1;
            const zone = getZoneType(rank, totalPlayers ?? 0);
            
            return (
              <View style={[
                styles.row,
                item.isMe && styles.myRow,
                zone === 'PROMOTION' && styles.promotionRow,
                zone === 'DEMOTION' && styles.demotionRow
              ]}>
                <View style={styles.rankContainer}>
                  {rank !== null ? (
                    <Text style={[
                      styles.rankText, 
                      item.isMe && styles.myText,
                      zone === 'PROMOTION' && styles.promotionText,
                      zone === 'DEMOTION' && styles.demotionText
                    ]}>{rank}</Text>
                  ) : (
                    <FontAwesome5 name="user" size={16} color="#ccc" />
                  )}
                </View>
                <View style={styles.nameContainer}>
                  <Text style={[styles.nameText, item.isMe && styles.myText]}>{item.name}</Text>
                  {item.streakDays >= 3 && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 6 }}>
                      <Text style={styles.streakText}>{item.streakDays}</Text>
                      <FontAwesome5 name="fire" size={12} color="#FF9500" style={{ marginLeft: 2 }} />
                    </View>
                  )}
                </View>
                <Text style={[styles.xpText, item.isMe && styles.myText]}>
                  {activeTab === 'ALL_TIME' ? item.xp : item.weeklyXp} XP
                </Text>
                
                {/* High-Five button (not on own row) */}
                {!item.isMe && (
                  <TouchableOpacity
                    style={[
                      styles.highFiveButton,
                      (sentToday.has(item.name.toLowerCase()) || highFiveCooldown) && styles.highFiveButtonDisabled
                    ]}
                    onPress={() => sendHighFive(item.name)}
                    disabled={sentToday.has(item.name.toLowerCase()) || highFiveCooldown}
                  >
                    <FontAwesome5 
                      name="hand-paper" 
                      size={14} 
                      color={sentToday.has(item.name.toLowerCase()) ? "#ccc" : "#FF9500"} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListFooterComponent={() => {
            if (searchQuery.trim().length > 0 || leaderboard.length === 0) return null;
            return (
              <View style={styles.paginationFooter}>
                <TouchableOpacity 
                  style={[styles.pageButton, pageOffset === 0 && styles.pageButtonDisabled]} 
                  onPress={() => fetchLeaderboard('TOP')}
                  disabled={pageOffset === 0 || loading}
                >
                  <FontAwesome5 name="angle-double-left" size={16} color={pageOffset === 0 ? "#ccc" : "#4A90D9"} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.pageButton, pageOffset === 0 && styles.pageButtonDisabled]} 
                  onPress={() => fetchLeaderboard('PREV')}
                  disabled={pageOffset === 0 || loading}
                >
                  <FontAwesome5 name="angle-left" size={16} color={pageOffset === 0 ? "#ccc" : "#4A90D9"} />
                </TouchableOpacity>

                <View style={styles.pageIndicator}>
                  <Text style={styles.pageText}>
                    {pageOffset + 1} - {pageOffset + leaderboard.length}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[styles.pageButton, leaderboard.length < 50 && styles.pageButtonDisabled]} 
                  onPress={() => fetchLeaderboard('NEXT')}
                  disabled={leaderboard.length < 50 || loading}
                >
                  <FontAwesome5 name="angle-right" size={16} color={leaderboard.length < 50 ? "#ccc" : "#4A90D9"} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.pageButton} 
                  onPress={() => fetchLeaderboard('BOTTOM')}
                  disabled={loading}
                >
                  <FontAwesome5 name="angle-double-right" size={16} color="#4A90D9" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#4A90D9',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  jumpButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  jumpButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1565C0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
    borderLeftColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  promotionText: {
    color: '#2E7D32',
  },
  demotionRow: {
    borderLeftWidth: 6,
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  demotionText: {
    color: '#C62828',
  },
  myRow: {
    backgroundColor: '#E3F2FD',
    borderColor: '#BBDEFB',
  },
  rankContainer: {
    width: 35,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#777',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  streakText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '700',
    marginLeft: 6,
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
  paginationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#4A90D9',
  },
  pageButtonDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  pageIndicator: {
    paddingHorizontal: 12,
  },
  pageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  highFiveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  highFiveButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
});
