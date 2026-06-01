import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator
} from "react-native";
import { progressStore } from "../stores/progressStore";
import { Filter } from 'bad-words';
import { db, auth, isFirebaseConfigured } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { FontAwesome5 } from "@expo/vector-icons";

interface WelcomeScreenProps {
  onDismiss: () => void;
}

export function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    setError(null);

    if (!isFirebaseConfigured) {
      const trimmedName = nameInput.trim();
      if (!trimmedName) {
        setError("Please enter a username.");
        return;
      }
      if (trimmedName.length < 2 || trimmedName.length > 20) {
        setError("Username must be between 2 and 20 characters.");
        return;
      }
      const filter = new Filter();
      if (filter.isProfane(trimmedName)) {
        setError("Username contains inappropriate language.");
        return;
      }

      setIsLoading(true);
      try {
        progressStore.getState().setUid("offline-user");
        progressStore.getState().setUsername(trimmedName);
        onDismiss();
      } catch (err: any) {
        console.error("Offline setup error:", err);
        setError("Failed to initialize offline player.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "signup") {
      const trimmedName = nameInput.trim();
      if (!trimmedName) {
        setError("Please enter a username.");
        return;
      }
      if (trimmedName.length < 2 || trimmedName.length > 20) {
        setError("Username must be between 2 and 20 characters.");
        return;
      }
      const filter = new Filter();
      if (filter.isProfane(trimmedName)) {
        setError("Username contains inappropriate language.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (!isFirebaseConfigured || !db || !auth) {
        throw new Error("Cloud database not configured.");
      }

      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const uid = userCredential.user.uid;
        const trimmedName = nameInput.trim();

        await setDoc(doc(db, 'users', uid), {
          username: trimmedName,
          usernameLower: trimmedName.toLowerCase(),
          xp: 0,
          weeklyXp: 0,
          streakDays: 0,
          crowns: 0,
          streakFreezes: 0,
          nodeSkin: 'default',
          leagueTier: 'Bronze',
          lastActive: new Date().toISOString()
        });

        progressStore.getState().setUid(uid);
        progressStore.getState().setUsername(trimmedName);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const uid = userCredential.user.uid;

        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const progressRef = doc(db, 'users', uid, 'data', 'progress');
          const progressDoc = await getDoc(progressRef);
          
          const restoreData: any = {
            uid: uid,
            username: data.username || "Player",
            xp: data.xp || 0,
            weeklyXp: data.weeklyXp || 0,
            streakDays: data.streakDays || 0,
            crowns: data.crowns || 0,
            streakFreezes: data.streakFreezes || 0,
            nodeSkin: data.nodeSkin || 'default',
            leagueTier: data.leagueTier || 'Bronze',
          };
          
          if (progressDoc.exists()) {
            const pData = progressDoc.data();
            if (pData.entries) restoreData.entries = pData.entries;
            if (pData.lessonSessions) restoreData.lessonSessions = pData.lessonSessions;
            if (pData.completedLessons) restoreData.completedLessons = pData.completedLessons;
            if (pData.achievements) restoreData.achievements = pData.achievements;
          }
          
          progressStore.getState().restoreFromCloud(restoreData);
        } else {
          progressStore.getState().setUid(uid);
        }
      }
      onDismiss();
    } catch (err: any) {
      console.error("Firebase auth error:", err);
      let msg = "Authentication failed.";
      if (err.code === "auth/email-already-in-use") msg = "Email is already in use.";
      else if (err.code === "auth/invalid-credential") msg = "Invalid email or password.";
      else if (err.code === "auth/weak-password") msg = "Password should be at least 6 characters.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email.trim());
        setError("Password reset email sent! Check your inbox.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to send reset email.");
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
          <Text style={styles.title}>BibleLingo</Text>
          
          {isFirebaseConfigured ? (
            <>
              <Text style={styles.subtitle}>
                {mode === "login" ? "Welcome back! Log in to continue your journey." : "Create an account to track your progress and climb the leaderboard!"}
              </Text>

              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab, mode === "login" && styles.activeTab]}
                  onPress={() => { setMode("login"); setError(null); }}
                >
                  <Text style={[styles.tabText, mode === "login" && styles.activeTabText]}>Log In</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, mode === "signup" && styles.activeTab]}
                  onPress={() => { setMode("signup"); setError(null); }}
                >
                  <Text style={[styles.tabText, mode === "signup" && styles.activeTabText]}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, error && error.includes("email") ? styles.inputError : null]}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={(text) => { setEmail(text); setError(null); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <TextInput
                style={[styles.input, error && error.includes("password") ? styles.inputError : null]}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(text) => { setPassword(text); setError(null); }}
                secureTextEntry
              />

              {mode === "signup" && (
                <TextInput
                  style={[styles.input, error && error.toLowerCase().includes("username") ? styles.inputError : null]}
                  placeholder="Choose a Username"
                  placeholderTextColor="#999"
                  value={nameInput}
                  onChangeText={(text) => { setNameInput(text); setError(null); }}
                  maxLength={20}
                  autoCapitalize="words"
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Welcome to BibleLingo! Enter a username to begin memorizing and competing offline.
              </Text>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ Cloud Database Disconnected</Text>
                <Text style={styles.warningSubtext}>
                  To enable cross-device cloud saving, leaderboards, and passwords, configure your Firebase credentials in the project's .env file.
                </Text>
              </View>

              <TextInput
                style={[styles.input, error && error.toLowerCase().includes("username") ? styles.inputError : null]}
                placeholder="Choose a Username"
                placeholderTextColor="#999"
                value={nameInput}
                onChangeText={(text) => { setNameInput(text); setError(null); }}
                maxLength={20}
                autoCapitalize="words"
              />
            </>
          )}

          {error && <Text style={[styles.errorText, error.includes("sent!") && { color: '#10B981' }]}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.7 }]}
            onPress={handleAction}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isFirebaseConfigured ? (mode === "login" ? "Log In" : "Sign Up") : "Play Offline"}
              </Text>
            )}
          </TouchableOpacity>

          {isFirebaseConfigured && mode === "login" && (
            <TouchableOpacity onPress={handleForgotPassword} style={{ marginTop: 16 }}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
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
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    width: "100%",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#0F172A",
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
    marginBottom: 12,
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
    marginBottom: 12,
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
    marginTop: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  forgotText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  warningBox: {
    backgroundColor: "#FFF9E6",
    borderColor: "#FFE0B2",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: "100%",
  },
  warningText: {
    fontSize: 14,
    color: "#E65100",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 12,
    color: "#F57C00",
    textAlign: "center",
    lineHeight: 16,
  },
});
