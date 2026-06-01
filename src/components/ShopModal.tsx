import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useStore } from 'zustand';
import { progressStore } from '../stores/progressStore';
import { FontAwesome5 } from '@expo/vector-icons';

interface ShopModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ShopModal({ visible, onClose }: ShopModalProps) {
  const crowns = useStore(progressStore, s => s.crowns);
  const streakFreezes = useStore(progressStore, s => s.streakFreezes);
  const nodeSkin = useStore(progressStore, s => s.nodeSkin);
  const ownedSkins = useStore(progressStore, s => s.ownedSkins) || ['default'];
  const buyStreakFreeze = useStore(progressStore, s => s.buyStreakFreeze);
  const buyNodeSkin = useStore(progressStore, s => s.buyNodeSkin);

  const handleBuyFreeze = () => {
    if (crowns >= 50) {
      buyStreakFreeze();
    } else {
      Alert.alert("Not enough Crowns", "You need 50 Crowns to buy a Streak Freeze.");
    }
  };

  const handleBuySkin = (skinId: string, cost: number) => {
    if (nodeSkin === skinId) return; // Already owned/equipped
    if (crowns >= cost) {
      buyNodeSkin(skinId);
    } else {
      Alert.alert("Not enough Crowns", `You need ${cost} Crowns to buy this skin.`);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <FontAwesome5 name="crown" size={20} color="#F5A623" style={{ marginRight: 8 }} />
          <Text style={styles.title}>The Crown Shop</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome5 name="times" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Your Balance:</Text>
          <View style={styles.balanceBadge}>
            <Text style={styles.balanceText}>{crowns}</Text>
            <FontAwesome5 name="crown" size={16} color="#F5A623" style={{ marginLeft: 6 }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Streak Freeze */}
          <View style={styles.itemCard}>
            <View style={styles.itemIconContainer}>
              <FontAwesome5 name="snowflake" size={32} color="#4A90D9" />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>Streak Freeze Shield</Text>
              <Text style={styles.itemDesc}>Miss a day without losing your streak!</Text>
              <Text style={styles.itemStock}>You own: {streakFreezes}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.buyButton, crowns < 50 && styles.buyButtonDisabled]}
              onPress={handleBuyFreeze}
            >
              <Text style={styles.buyButtonText}>50 Crowns</Text>
            </TouchableOpacity>
          </View>

          {/* Classic Skin */}
          <View style={styles.itemCard}>
            <View style={[styles.itemIconContainer, { backgroundColor: '#E0E0E0' }]}>
              <FontAwesome5 name="circle" size={32} color="#666" />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>Classic Node Skin</Text>
              <Text style={styles.itemDesc}>The standard learning path nodes.</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.buyButton, 
                nodeSkin === 'default' && styles.equippedButton
              ]}
              onPress={() => buyNodeSkin('default')}
              disabled={nodeSkin === 'default'}
            >
              <Text style={nodeSkin === 'default' ? styles.equippedText : styles.buyButtonText}>
                {nodeSkin === 'default' ? 'Equipped' : 'Equip'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Obsidian Skin */}
          <View style={styles.itemCard}>
            <View style={[styles.itemIconContainer, { backgroundColor: '#333' }]}>
              <FontAwesome5 name="gem" size={32} color="#FFF" />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>Obsidian Node Skin</Text>
              <Text style={styles.itemDesc}>Sleek dark nodes for your learning path.</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.buyButton, 
                nodeSkin === 'obsidian' && styles.equippedButton,
                nodeSkin !== 'obsidian' && !ownedSkins.includes('obsidian') && crowns < 150 && styles.buyButtonDisabled
              ]}
              onPress={() => handleBuySkin('obsidian', 150)}
              disabled={nodeSkin === 'obsidian'}
            >
              <Text style={nodeSkin === 'obsidian' ? styles.equippedText : styles.buyButtonText}>
                {nodeSkin === 'obsidian' ? 'Equipped' : (ownedSkins.includes('obsidian') ? 'Equip' : '150 Crowns')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Golden Skin */}
          <View style={styles.itemCard}>
            <View style={[styles.itemIconContainer, { backgroundColor: '#F5A623' }]}>
              <FontAwesome5 name="star" size={32} color="#FFF" />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>Golden Node Skin</Text>
              <Text style={styles.itemDesc}>Radiant golden nodes for true scholars.</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.buyButton, 
                nodeSkin === 'gold' && styles.equippedButton,
                nodeSkin !== 'gold' && !ownedSkins.includes('gold') && crowns < 500 && styles.buyButtonDisabled
              ]}
              onPress={() => handleBuySkin('gold', 500)}
              disabled={nodeSkin === 'gold'}
            >
              <Text style={nodeSkin === 'gold' ? styles.equippedText : styles.buyButtonText}>
                {nodeSkin === 'gold' ? 'Equipped' : (ownedSkins.includes('gold') ? 'Equip' : '500 Crowns')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4891A',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5A623',
  },
  scroll: {
    padding: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  itemStock: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90D9',
    marginTop: 6,
  },
  buyButton: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 12,
  },
  buyButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  equippedButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
  },
  equippedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E7D32',
  }
});
