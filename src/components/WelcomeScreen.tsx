import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from "react-native";
import { progressStore } from "../stores/progressStore";
import { Filter } from 'bad-words';
import { db, isFirebaseConfigured } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FontAwesome5 } from "@expo/vector-icons";

interface WelcomeScreenProps {
  onDismiss: () => void;
}

export function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
  const [nameInput, setNameInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleStart = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError("Please enter a username to start.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 20) {
      setError("Username must be 20 characters or less.");
      return;
    }

    const filter = new Filter();
    if (filter.isProfane(trimmed)) {
      setError("Username contains inappropriate language.");
      return;
    }

    setIsLoading(true);
    try {
      if (isFirebaseConfigured && db) {
        const userRef = doc(db, 'users', trimmed.toLowerCase());
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            username: trimmed,
            usernameLower: trimmed.toLowerCase(),
            xp: 0,
            weeklyXp: 0,
            streakDays: 0,
            crowns: 0,
            streakFreezes: 0,
            nodeSkin: 'default',
            leagueTier: 'Bronze',
            lastActive: new Date().toISOString()
          });
        }
      }

      // Save to local progressStore
      progressStore.getState().setUsername(trimmed);
      onDismiss();
    } catch (err) {
      console.error("Firebase error:", err);
      setError("Could not connect to the cloud database.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.card}>
          <FontAwesome5 name="trophy" size={48} color="#F5A623" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Welcome to BibleLingo!</Text>
          <Text style={styles.subtitle}>
            Begin your scripture memorization journey. Choose a username to track your progress and climb the leaderboard!
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Enter your username"
            placeholderTextColor="#999"
            value={nameInput}
            onChangeText={(text) => {
              setNameInput(text);
              if (error) setError(null);
            }}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleStart}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.7 }]}
            onPress={handleStart}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? "Connecting..." : "Start Journey"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  input: {
    width: "100%",
    height: 52,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "600",
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    alignSelf: "flex-start",
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    width: "100%",
    height: 52,
    backgroundColor: "#10B981",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 16,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
