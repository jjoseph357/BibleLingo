import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { audioService } from '../services/AudioService';

interface LeaguePromotionModalProps {
  visible: boolean;
  fromTier: string;
  toTier: string;
  status: 'promoted' | 'demoted';
  onClose: () => void;
}

const LEAGUE_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#b9f2ff',
  Master: '#ff4081',
};

const LEAGUE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Bronze: 'shield-outline',
  Silver: 'shield-half-outline',
  Gold: 'shield',
  Platinum: 'star',
  Diamond: 'diamond',
  Master: 'flash',
};

export function LeaguePromotionModal({ visible, fromTier, toTier, status, onClose }: LeaguePromotionModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      rotateAnim.setValue(0);

      if (status === 'promoted') {
        audioService.playRankup();
      } else {
        // Demotion sound maybe later
      }

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 10000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        )
      ]).start();
    }
  }, [visible, status]);

  if (!visible) return null;

  const isPromoted = status === 'promoted';
  const color = LEAGUE_COLORS[toTier] || LEAGUE_COLORS['Bronze'];
  const iconName = LEAGUE_ICONS[toTier] || 'shield';

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.container}>

            <Text style={styles.title}>
              {isPromoted ? 'Promoted!' : 'Demoted'}
            </Text>
            <Text style={styles.subtitle}>
              You are now in the <Text style={{ color, fontWeight: 'bold' }}>{toTier}</Text> League
            </Text>

            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={100} color={color} />
            </View>

            <TouchableOpacity style={[styles.button, { backgroundColor: color }]} onPress={onClose}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '85%',
    borderRadius: 20,
  },
  container: {
    width: '100%',
    backgroundColor: '#1E1E24',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAA',
    marginBottom: 30,
    textAlign: 'center',
  },
  iconContainer: {
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 40,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
