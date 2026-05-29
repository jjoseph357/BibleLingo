import React from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { PathScreen } from "./src/components/PathScreen";
import { DevMenu } from "./src/components/DevMenu";
import { WelcomeScreen } from "./src/components/WelcomeScreen";
import { LibraryScreen } from "./src/components/LibraryScreen";

import { useStore } from "zustand";
import { lessonStore } from "./src/stores/lessonStore";
import { LessonLoader } from "./src/components/LessonLoader";
import { OfflineError } from "./src/components/OfflineError";
import { ScrambleQuestion } from "./src/components/ScrambleQuestion";
import { CopyrightFooter } from "./src/components/CopyrightFooter";
import { TouchableOpacity, Text, View, KeyboardAvoidingView, Platform, AppState } from "react-native";
import { useAchievements } from "./src/hooks/useAchievements";
import { useFonts } from "expo-font";
import { FontAwesome5 } from "@expo/vector-icons";
import { audioService } from "./src/services/AudioService";
import ConfettiCannon from "react-native-confetti-cannon";

import { progressStore } from "./src/stores/progressStore";
import { computeNextReview } from "./src/utils/srs";
import { MissingLinkQuestion } from "./src/components/MissingLinkQuestion";
import { ScribeQuestion } from "./src/components/ScribeQuestion";
import { GlobalFeedbackSheet } from "./src/components/animations/GlobalFeedbackSheet";
import { checkAchievements } from "./src/utils/achievementEngine";
import { LeagueScreen } from "./src/components/LeagueScreen";
import { TypeBlankQuestion } from "./src/components/TypeBlankQuestion";
import { ProfileScreen } from "./src/components/ProfileScreen";
import { ToastNotification } from "./src/components/animations/ToastNotification";
import { ProgressBar } from "./src/components/animations/ProgressBar";
import { generateMasteryTrack } from "./src/utils/mastery";
import { NavigatorEasyQuestion } from "./src/components/NavigatorEasyQuestion";
import { NavigatorHardQuestion } from "./src/components/NavigatorHardQuestion";

type GameMode = "SCRAMBLE" | "MISSING_LINK" | "TYPE_BLANK" | "SCRIBE" | "NAVIGATOR_EASY" | "NAVIGATOR_HARD";
type ActiveMode = GameMode | "INTRO";

const CYCLE_MODES: GameMode[] = ["SCRAMBLE", "MISSING_LINK", "TYPE_BLANK"];

interface VerseMasteryState {
  level: number;              // 0=Intro, 1=Cycle1, 2=Cycle2, 3=Scribe, 4=Mastered
  completedModes: GameMode[]; // Modes passed at the current level (levels 1 & 2 only)
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...FontAwesome5.font,
  });

  const { checkAchievements } = useAchievements();
  const [showConfetti, setShowConfetti] = React.useState(false);

  React.useEffect(() => {
    audioService.init();
  }, []);

  const username = useStore(progressStore, s => s.username);
  const [activeScreen, setActiveScreen] = React.useState<"path" | "lesson" | "league" | "profile" | "library">("path");
  const [feedbackStatus, setFeedbackStatus] = React.useState<"idle" | "correct" | "incorrect">("idle");

  // Mastery step index tracking per verse (keyed by verseReference)
  const [verseStepIndex, setVerseStepIndex] = React.useState<Record<string, number>>({});
  const [currentVerseRef, setCurrentVerseRef] = React.useState<string>("");
  const [currentMode, setCurrentMode] = React.useState<ActiveMode>("INTRO");
  const [currentMissingCount, setCurrentMissingCount] = React.useState(1);
  // Track last failed verse to enable rotation
  const [lastFailedRef, setLastFailedRef] = React.useState<string | null>(null);
  // Track the verse reference for the last shown intro to force its first quiz immediately after
  const [lastShownIntroReference, setLastShownIntroReference] = React.useState<string | null>(null);
  // Track if any mistake was made in the current lesson session to calculate the perfect score bonus
  const [hasFailedAny, setHasFailedAny] = React.useState(false);

  const {
    isLoading,
    offlineError,
    verses: rawVerses,
    currentQuestionIndex,
    copyrightText,
    isLessonComplete,
    isReviewMode,
    lessonId,
    lastPlayedVerseReference
  } = useStore(lessonStore);

  const verses = React.useMemo(() => {
    return rawVerses.map(v => ({
      ...v,
      masteryTrack: isReviewMode
        ? [{ mode: "SCRIBE" as const, missingCount: 0 }]
        : generateMasteryTrack(v.verseText || "")
    }));
  }, [rawVerses, isReviewMode]);

  // Initialize mastery step index when verses load
  React.useEffect(() => {
    if (verses.length > 0 && Object.keys(verseStepIndex).length === 0) {
      // Check if there is an in-progress session for this lessonId
      const sessions = progressStore.getState().lessonSessions;
      const savedSession = lessonId ? sessions[lessonId] : null;

      if (savedSession && savedSession.status === "in_progress" && !isReviewMode) {
        // Safe migration from verseMastery to verseStepIndex
        const loadedIndex: Record<string, number> = {};
        verses.forEach(v => {
          const track = v.masteryTrack || [];
          if (savedSession.verseStepIndex && typeof savedSession.verseStepIndex[v.verseReference] === "number") {
            loadedIndex[v.verseReference] = savedSession.verseStepIndex[v.verseReference];
          } else if (savedSession.verseMastery && savedSession.verseMastery[v.verseReference]) {
            // Old format migration
            const oldVal = savedSession.verseMastery[v.verseReference];
            const oldLevel = typeof oldVal === "number" ? oldVal : (oldVal as any).level ?? 0;
            if (oldLevel === 0) {
              loadedIndex[v.verseReference] = 0;
            } else if (oldLevel === 4) {
              loadedIndex[v.verseReference] = track.length + 1;
            } else if (oldLevel === 3) {
              loadedIndex[v.verseReference] = track.length; // Scribe
            } else {
              loadedIndex[v.verseReference] = Math.min(oldLevel * 2, track.length);
            }
          } else {
            loadedIndex[v.verseReference] = 0;
          }
        });
        setVerseStepIndex(loadedIndex);
      } else {
        const initial: Record<string, number> = {};
        verses.forEach(v => {
          // Standard lessons start at step index 0 (Intro), temporary reviews bypass Intro and start at 1.
          initial[v.verseReference] = isReviewMode ? 1 : 0;
        });
        setVerseStepIndex(initial);
      }
    }
  }, [verses, isReviewMode, lessonId]);

  // Select the next question whenever mastery state changes
  React.useEffect(() => {
    if (verses.length === 0 || Object.keys(verseStepIndex).length === 0) return;
    if (feedbackStatus !== "idle") return;

    selectNextQuestion();
  }, [verseStepIndex, feedbackStatus, verses]);

  // Return to path if lesson finishes
  React.useEffect(() => {
    if (isLessonComplete && feedbackStatus === "idle") {
      const xpToAward = isReviewMode ? 5 : 10;
      progressStore.getState().addXp(xpToAward);
      progressStore.getState().updateStreak();
      checkAchievements();
      
      // Economy & Gamification
      progressStore.getState().addCrowns(isReviewMode ? 2 : 5);
      if (!isReviewMode) {
        progressStore.getState().updateDailyQuest('studiedNew');
      }
      if (!progressStore.getState().xpBoostEndTime) {
        progressStore.getState().activateXpBoost();
      }
      
      progressStore.getState().syncToCloud();

      if (isReviewMode && !hasFailedAny) {
        progressStore.getState().showToast("Perfect Review! +10 XP Bonus!");
        setShowConfetti(true);
        audioService.playLessonFinish();
        setTimeout(() => setShowConfetti(false), 5000);
      } else if (isReviewMode) {
        progressStore.getState().showToast("Review Complete! +5 XP Bonus!");
      } else {
        progressStore.getState().showToast("Lesson Complete! +5 XP Bonus!");
        audioService.playLessonFinish();
      }

      setActiveScreen("path");
    }
  }, [isLessonComplete, feedbackStatus, isReviewMode, hasFailedAny]);

  // Reset all lesson-specific states when exiting the lesson screen
  React.useEffect(() => {
    if (activeScreen !== "lesson") {
      setVerseStepIndex({});
      setLastFailedRef(null);
      setLastShownIntroReference(null);
      setHasFailedAny(false);
      
      // Fetch pending high-fives when returning from a lesson
      if (username) {
        progressStore.getState().fetchHighFives();
      }
    }
  }, [activeScreen]);

  // Fetch high-fives on initial app load
  React.useEffect(() => {
    if (username) {
      progressStore.getState().fetchHighFives();
    }
  }, [username]);

  // Display pending high-five toasts sequentially
  const pendingHighFives = useStore(progressStore, s => s.pendingHighFives);
  React.useEffect(() => {
    if (pendingHighFives.length === 0) return;
    
    // Show toasts one at a time with a small delay
    let delay = 0;
    pendingHighFives.forEach(hf => {
      setTimeout(() => {
        progressStore.getState().showToast(`${hf.from} sent you a High-Five!`);
      }, delay);
      delay += 3500; // 3.5s between toasts (3s display + 0.5s gap)
    });
    
    // Clear after all are scheduled
    setTimeout(() => {
      progressStore.getState().clearPendingHighFives();
    }, delay);
  }, [pendingHighFives]);

  function selectNextQuestion() {
    // Find all unmastered verses (step index <= track length)
    const unmastered = verses.filter(v => {
      const stepIndex = verseStepIndex[v.verseReference] ?? 0;
      const track = v.masteryTrack || [];
      return stepIndex <= track.length;
    });

    if (unmastered.length === 0) {
      // All mastered — complete the lesson
      lessonStore.setState({ isLessonComplete: true });
      if (lessonId && !isReviewMode) {
        progressStore.getState().completeLessonSession(lessonId);
      }
      return;
    }

    // Dynamic Active Pool: first 3 unmastered verses
    const activePool = unmastered.slice(0, 3);

    let chosen;

    // 1. Force the exact same verse if we just showed its Intro (and it's still in the active pool)
    if (lastShownIntroReference) {
      const target = activePool.find(v => v.verseReference === lastShownIntroReference);
      if (target) {
        chosen = target;
      }
      setLastShownIntroReference(null); // Clear the forced state
    }

    // 2. Standard selection if not forced (select exclusively from the active pool)
    if (!chosen) {
      // Forced Interleaving: filter out the last played verse from the active pool
      let poolToSelectFrom = activePool.filter(v => v.verseReference !== lastPlayedVerseReference);
      if (poolToSelectFrom.length === 0) {
        poolToSelectFrom = activePool; // Fallback if only 1 verse remains
      }

      const startedInPool = poolToSelectFrom.filter(v => {
        const stepIndex = verseStepIndex[v.verseReference] ?? 0;
        return stepIndex >= 1;
      });

      const unstartedInPool = poolToSelectFrom.filter(v => {
        const stepIndex = verseStepIndex[v.verseReference] ?? 0;
        return stepIndex === 0;
      });

      // Max active verses limit is 2 (interleaves up to 2 active started verses at a time inside the pool)
      if (startedInPool.length === 0) {
        // No active started verses: must start a new one
        chosen = unstartedInPool[0];
      } else if (startedInPool.length < 2 && unstartedInPool.length > 0) {
        // Less than 2 active started verses: start a new one
        chosen = unstartedInPool[0];
      } else {
        // We have reached the interleaving limit, or have no more unstarted verses in the pool:
        // Pick from active started verses in the pool. Interleave them.
        let candidates = startedInPool;

        // Find the lowest step index among started verses in the pool to keep them relatively together
        const lowestStepIndex = Math.min(...startedInPool.map(v => verseStepIndex[v.verseReference] ?? 0));
        candidates = startedInPool.filter(v => verseStepIndex[v.verseReference] === lowestStepIndex);

        chosen = candidates[0];
        if (lastFailedRef && candidates.length > 1) {
          const other = candidates.find(v => v.verseReference !== lastFailedRef);
          if (other) chosen = other;
        }
      }
    }

    // Increment question index in store if this is an actual transition to a new question
    if (currentVerseRef) {
      const storeState = lessonStore.getState();
      lessonStore.setState({ currentQuestionIndex: storeState.currentQuestionIndex + 1 });
    }

    setCurrentVerseRef(chosen.verseReference);
    const stepIndex = verseStepIndex[chosen.verseReference] ?? 0;
    const track = chosen.masteryTrack || [];

    if (stepIndex === 0) {
      setCurrentMode("INTRO");
    } else {
      const step = track[stepIndex - 1];
      if (step) {
        setCurrentMode(step.mode);
        setCurrentMissingCount(step.missingCount);
      }
    }
  }

  const handleAnswerSubmit = (isCorrect: boolean, hintsUsed?: number) => {
    const currentVerse = verses.find(v => v.verseReference === currentVerseRef);
    if (!currentVerse) return;

    // Scribe hint penalty: if more than half the words were revealed, treat as incorrect
    let finalCorrect = isCorrect;
    if (currentMode === "SCRIBE" && hintsUsed && hintsUsed > 0) {
      const totalWords = (currentVerse.verseText || "").trim().split(/\s+/).length;
      if (hintsUsed > Math.floor(totalWords / 2)) {
        finalCorrect = false;
      }
    }

    if (!finalCorrect) {
      setHasFailedAny(true);
    }

    lessonStore.getState().submitAnswer(finalCorrect, currentVerseRef);

    const pState = progressStore.getState();
    const currentRecord = pState.entries.find(e => e.verseReference === currentVerse.verseReference) || {
      verseReference: currentVerse.verseReference,
      intervalDays: 0,
      nextReviewDate: new Date().toISOString(),
      repetitions: 0
    };

    const nextRecord = computeNextReview(currentRecord, finalCorrect);
    pState.addOrUpdate(nextRecord);

    setFeedbackStatus(finalCorrect ? "correct" : "incorrect");
  };

  const handleIntroComplete = () => {
    // Advance from index 0 to index 1 (Step 1 of track)
    setVerseStepIndex(prev => ({
      ...prev,
      [currentVerseRef]: 1,
    }));
    // Record that we just showed the intro for this verse reference to force its first quiz next
    setLastShownIntroReference(currentVerseRef);
  };

  const handleFeedbackContinue = () => {
    const wasCorrect = feedbackStatus === "correct";
    setFeedbackStatus("idle");

    if (!wasCorrect) {
      // Wrong: don't advance mastery, mark for rotation
      setLastFailedRef(currentVerseRef);
      return; // selectNextQuestion will fire via useEffect
    }

    // Correct: advance mastery step index
    setLastFailedRef(null);
    const stepIndex = verseStepIndex[currentVerseRef] ?? 0;
    const track = verses.find(v => v.verseReference === currentVerseRef)?.masteryTrack || [];

    if (stepIndex >= 1 && stepIndex <= track.length) {
      const currentStep = track[stepIndex - 1];
      if (currentStep && currentStep.mode === "SCRIBE") {
        progressStore.getState().incrementPerfectScribes();
      }

      const nextStepIndex = stepIndex + 1;
      setVerseStepIndex(prev => ({
        ...prev,
        [currentVerseRef]: nextStepIndex,
      }));

      // Micro-Reward & Streak Protection if verse is FULLY MASTERED in this session
      if (nextStepIndex > track.length) {
        progressStore.getState().addXp(3); // Micro-XP!
        progressStore.getState().updateStreak(); // Instant Streak Protection!
        progressStore.getState().showToast("Verse Mastered! +3 XP!");
        progressStore.getState().syncToCloud(); // Sync score to cloud instantly!
      }
    }
  };

  const feedbackVerse = verses.find(v => v.verseReference === currentVerseRef);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
          <ConfettiCannon count={200} origin={{x: -10, y: 0}} />
        </View>
      )}

      {username === null ? (
        <WelcomeScreen onDismiss={() => setActiveScreen("path")} />
      ) : (
        <>
          {activeScreen === "path" && (
            <PathScreen
              onStartLesson={() => setActiveScreen("lesson")}
              onStartReview={() => setActiveScreen("lesson")}
            />
          )}
          {activeScreen === "league" && <LeagueScreen />}
          {activeScreen === "profile" && <ProfileScreen />}
          {activeScreen === "library" && <LibraryScreen />}
          {activeScreen === "lesson" && (
            <LessonEngine
              onBackToPath={() => setActiveScreen("path")}
              isLoading={isLoading}
              offlineError={offlineError}
              verses={verses}
              currentVerseRef={currentVerseRef}
              verseStepIndex={verseStepIndex}
              currentMode={currentMode}
              currentMissingCount={currentMissingCount}
              copyrightText={copyrightText}
              handleIntroComplete={handleIntroComplete}
              handleAnswerSubmit={handleAnswerSubmit}
              currentQuestionIndex={currentQuestionIndex}
              lessonId={lessonId}
            />
          )}

          {activeScreen === "lesson" && feedbackVerse && (
            <GlobalFeedbackSheet
              status={feedbackStatus}
              targetVerseText={
                currentMode === "NAVIGATOR_EASY" || currentMode === "NAVIGATOR_HARD"
                  ? `Correct Reference: ${feedbackVerse.verseReference}`
                  : feedbackVerse.verseText || ""
              }
              onContinue={handleFeedbackContinue}
            />
          )}

          {activeScreen !== "lesson" && (
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={[styles.navTab, activeScreen === "path" && styles.navTabActive]}
                onPress={() => setActiveScreen("path")}
              >
                <FontAwesome5 
                  name="map-marked-alt" 
                  size={18} 
                  color={activeScreen === "path" ? "#4A90D9" : "#888"} 
                  style={{ marginBottom: 4 }}
                />
                <Text style={[styles.navText, activeScreen === "path" && styles.navTextActive]}>Path</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, activeScreen === "league" && styles.navTabActive]}
                onPress={() => setActiveScreen("league")}
              >
                <FontAwesome5 
                  name="trophy" 
                  size={18} 
                  color={activeScreen === "league" ? "#4A90D9" : "#888"} 
                  style={{ marginBottom: 4 }}
                />
                <Text style={[styles.navText, activeScreen === "league" && styles.navTextActive]}>League</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, activeScreen === "library" && styles.navTabActive]}
                onPress={() => setActiveScreen("library")}
              >
                <FontAwesome5 
                  name="book-open" 
                  size={18} 
                  color={activeScreen === "library" ? "#4A90D9" : "#888"} 
                  style={{ marginBottom: 4 }}
                />
                <Text style={[styles.navText, activeScreen === "library" && styles.navTextActive]}>Library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, activeScreen === "profile" && styles.navTabActive]}
                onPress={() => setActiveScreen("profile")}
              >
                <FontAwesome5 
                  name="user-alt" 
                  size={18} 
                  color={activeScreen === "profile" ? "#4A90D9" : "#888"} 
                  style={{ marginBottom: 4 }}
                />
                <Text style={[styles.navText, activeScreen === "profile" && styles.navTextActive]}>Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <DevMenu />
      <ToastNotification />
    </SafeAreaView>
  );
}

interface LessonEngineProps {
  onBackToPath: () => void;
  isLoading: boolean;
  offlineError: string | null;
  verses: any[];
  currentVerseRef: string;
  verseStepIndex: Record<string, number>;
  currentMode: ActiveMode;
  currentMissingCount: number;
  copyrightText: string;
  handleIntroComplete: () => void;
  handleAnswerSubmit: (isCorrect: boolean, hintsUsed?: number) => void;
  currentQuestionIndex: number;
  lessonId: string | null;
}

function LessonEngine({
  onBackToPath,
  isLoading,
  offlineError,
  verses,
  currentVerseRef,
  verseStepIndex,
  currentMode,
  currentMissingCount,
  copyrightText,
  handleIntroComplete,
  handleAnswerSubmit,
  currentQuestionIndex,
  lessonId,
}: LessonEngineProps) {
  React.useEffect(() => {
    const saveSession = () => {
      const isReview = lessonStore.getState().isReviewMode;
      if (isReview || !lessonId || verses.length === 0 || Object.keys(verseStepIndex).length === 0) return;

      const totalSteps = verses.reduce((sum, v) => sum + (v.masteryTrack?.length || 0) + (isReview ? 0 : 1), 0);
      const currentSteps = Object.keys(verseStepIndex).reduce((sum, ref) => {
        const step = verseStepIndex[ref] || 0;
        return sum + (isReview ? Math.max(0, step - 1) : step);
      }, 0);
      const lessonProgress = totalSteps > 0 ? currentSteps / totalSteps : 0;

      const existing = progressStore.getState().lessonSessions[lessonId];
      const status = existing?.status === "completed" ? "completed" : "in_progress";

      progressStore.getState().saveLessonSession(lessonId, {
        status,
        verseStepIndex,
        progressPercentage: lessonProgress,
      });
    };

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        saveSession();
      }
    });

    return () => {
      saveSession();
      subscription.remove();
    };
  }, [lessonId, verses, verseStepIndex]);

  React.useEffect(() => {
    return () => {
      lessonStore.getState().resetLessonState();
    };
  }, []);

  if (isLoading) return <LessonLoader />;
  if (offlineError) return (
    <OfflineError
      message={offlineError}
      onRetry={() => lessonStore.getState().loadLesson(verses)}
    />
  );

  const currentVerse = verses.find(v => v.verseReference === currentVerseRef);
  if (!currentVerse) return null;
  const currentStep = verseStepIndex[currentVerseRef] ?? 0;

  const isReview = lessonStore.getState().isReviewMode;
  const totalSteps = verses.reduce((sum, v) => sum + (v.masteryTrack?.length || 0) + (isReview ? 0 : 1), 0);
  const currentSteps = Object.keys(verseStepIndex).reduce((sum, ref) => {
    const step = verseStepIndex[ref] || 0;
    return sum + (isReview ? Math.max(0, step - 1) : step);
  }, 0);
  const lessonProgress = totalSteps > 0 ? currentSteps / totalSteps : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity
        style={{ padding: 16, backgroundColor: '#eee' }}
        onPress={onBackToPath}
      >
        <Text>← Back to Path (Quit)</Text>
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <ProgressBar progress={lessonProgress} />
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {/* Top Header - Only show during exercise phase */}
        {currentMode !== "INTRO" && (
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#333", flex: 1 }}>
              {currentMode === "NAVIGATOR_EASY" || currentMode === "NAVIGATOR_HARD" 
                ? "Where is this verse found?" 
                : `Solve: ${currentVerse.verseReference}`}
            </Text>
            {currentVerse.masteryTrack && (
              <View style={{ backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: "#388E3C", fontSize: 12, fontWeight: "bold" }}>
                  Step {currentStep}/{currentVerse.masteryTrack.length}
                </Text>
              </View>
            )}
          </View>
        )}

        {currentMode === "INTRO" ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: "#666", textAlign: "center", marginBottom: 12 }}>
              Read: {currentVerse.verseReference}
            </Text>
            <Text style={{ fontSize: 24, lineHeight: 34, color: "#444", textAlign: "center", marginBottom: 40 }}>
              "{currentVerse.verseText}"
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: "#4A90D9", padding: 16, borderRadius: 12, alignItems: "center" }}
              onPress={handleIntroComplete}
            >
              <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "bold" }}>Continue to Exercise</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {currentMode === "SCRAMBLE" && (
              <ScrambleQuestion
                key={`${currentVerse.verseReference}_${currentQuestionIndex}`}
                targetVerse={currentVerse.verseText || ""}
                decoyWords={currentVerse.decoyWords}
                onSubmit={handleAnswerSubmit}
              />
            )}
            {currentMode === "MISSING_LINK" && (
              <MissingLinkQuestion
                key={`${currentVerse.verseReference}_${currentQuestionIndex}`}
                targetVerse={currentVerse.verseText || ""}
                decoyWords={currentVerse.decoyWords}
                blankCount={currentMissingCount}
                onSubmit={handleAnswerSubmit}
              />
            )}
            {currentMode === "TYPE_BLANK" && (
              <TypeBlankQuestion
                key={`${currentVerse.verseReference}_${currentQuestionIndex}`}
                targetVerse={currentVerse.verseText || ""}
                missingCount={currentMissingCount}
                onSubmit={handleAnswerSubmit}
              />
            )}
            {currentMode === "SCRIBE" && (
              <ScribeQuestion
                key={`${currentVerse.verseReference}_${currentQuestionIndex}`}
                targetVerse={currentVerse.verseText || ""}
                onSubmit={handleAnswerSubmit}
              />
            )}
            {currentMode === "NAVIGATOR_EASY" && (
              <NavigatorEasyQuestion
                key={`${currentVerse.verseReference}_${currentQuestionIndex}`}
                targetVerse={currentVerse}
                onSubmit={handleAnswerSubmit}
              />
            )}
            {currentMode === "NAVIGATOR_HARD" && (
              <NavigatorHardQuestion
                key={`${currentVerse.verseReference}_${currentQuestionIndex}`}
                targetVerse={currentVerse}
                onSubmit={handleAnswerSubmit}
              />
            )}
          </>
        )}
      </View>
      <CopyrightFooter text={copyrightText} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFF",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  navTabActive: {
    borderTopWidth: 3,
    borderTopColor: "#4A90D9",
    marginTop: -1,
  },
  navText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
  },
  navTextActive: {
    color: "#4A90D9",
    fontWeight: "800",
  },
});
