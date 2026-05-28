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
      setActiveScreen("path");
    }
  }, [isLessonComplete, feedbackStatus, isReviewMode]);

  // Reset all lesson-specific states when exiting the lesson screen
  React.useEffect(() => {
    if (activeScreen !== "lesson") {
      setVerseStepIndex({});
      setLastFailedRef(null);
      setLastShownIntroReference(null);
    }
  }, [activeScreen]);

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

  const handleAnswerSubmit = (isCorrect: boolean) => {
    const currentVerse = verses.find(v => v.verseReference === currentVerseRef);
    if (!currentVerse) return;

    lessonStore.getState().submitAnswer(isCorrect, currentVerseRef);

    const pState = progressStore.getState();
    const currentRecord = pState.entries.find(e => e.verseReference === currentVerse.verseReference) || {
      verseReference: currentVerse.verseReference,
      intervalDays: 0,
      nextReviewDate: new Date().toISOString(),
      repetitions: 0
    };

    const nextRecord = computeNextReview(currentRecord, isCorrect);
    pState.addOrUpdate(nextRecord);

    setFeedbackStatus(isCorrect ? "correct" : "incorrect");
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
      setVerseStepIndex(prev => ({
        ...prev,
        [currentVerseRef]: stepIndex + 1,
      }));
    }
  };

  const feedbackVerse = verses.find(v => v.verseReference === currentVerseRef);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
              targetVerseText={feedbackVerse.verseText || ""}
              onContinue={handleFeedbackContinue}
            />
          )}

          {activeScreen !== "lesson" && (
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={[styles.navTab, activeScreen === "path" && styles.navTabActive]}
                onPress={() => setActiveScreen("path")}
              >
                <Text style={[styles.navText, activeScreen === "path" && styles.navTextActive]}>🏠 Path</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, activeScreen === "league" && styles.navTabActive]}
                onPress={() => setActiveScreen("league")}
              >
                <Text style={[styles.navText, activeScreen === "league" && styles.navTextActive]}>🏆 League</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, activeScreen === "library" && styles.navTabActive]}
                onPress={() => setActiveScreen("library")}
              >
                <Text style={[styles.navText, activeScreen === "library" && styles.navTextActive]}>📚 Library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, activeScreen === "profile" && styles.navTabActive]}
                onPress={() => setActiveScreen("profile")}
              >
                <Text style={[styles.navText, activeScreen === "profile" && styles.navTextActive]}>👤 Profile</Text>
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
  handleAnswerSubmit: (isCorrect: boolean) => void;
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
              Solve: {currentVerse.verseReference}
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
    paddingVertical: 16,
  },
  navTabActive: {
    borderTopWidth: 3,
    borderTopColor: "#4A90D9",
    marginTop: -1,
  },
  navText: {
    fontSize: 16,
    color: "#888",
    fontWeight: "600",
  },
  navTextActive: {
    color: "#4A90D9",
    fontWeight: "800",
  },
});
