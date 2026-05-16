import React from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { PathScreen } from "./src/components/PathScreen";
import { DevMenu } from "./src/components/DevMenu";

import { useStore } from "zustand";
import { lessonStore } from "./src/stores/lessonStore";
import { LessonLoader } from "./src/components/LessonLoader";
import { OfflineError } from "./src/components/OfflineError";
import { ScrambleQuestion } from "./src/components/ScrambleQuestion";
import { CopyrightFooter } from "./src/components/CopyrightFooter";
import { TouchableOpacity, Text, View, KeyboardAvoidingView, Platform } from "react-native";

import { progressStore } from "./src/stores/progressStore";
import { computeNextReview } from "./src/utils/srs";
import { MissingLinkQuestion } from "./src/components/MissingLinkQuestion";
import { ScribeQuestion } from "./src/components/ScribeQuestion";
import { GlobalFeedbackSheet } from "./src/components/animations/GlobalFeedbackSheet";

type GameMode = "SCRAMBLE" | "MISSING_LINK" | "SCRIBE";

export default function App() {
  const [activeScreen, setActiveScreen] = React.useState<"path" | "lesson">("path");
  const [seenIntros, setSeenIntros] = React.useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = React.useState<"RECOGNITION" | "RECALL">("RECOGNITION");
  const [currentGameMode, setCurrentGameMode] = React.useState<GameMode>("SCRAMBLE");
  const [feedbackStatus, setFeedbackStatus] = React.useState<"idle" | "correct" | "incorrect">("idle");
  
  // Subscribe to lesson store for the mock Lesson Screen
  const { 
    isLoading, 
    offlineError, 
    verses, 
    currentQuestionIndex,
    copyrightText,
    isLessonComplete
  } = useStore(lessonStore);

  // Return to path if lesson finishes
  React.useEffect(() => {
    if (isLessonComplete && feedbackStatus === "idle") {
      setActiveScreen("path");
      setSeenIntros([]);
      setCurrentPhase("RECOGNITION");
    }
  }, [isLessonComplete, feedbackStatus]);

  // Select game mode when question or phase advances
  React.useEffect(() => {
    const currentVerse = verses[currentQuestionIndex];
    if (currentVerse) {
      if (currentPhase === "RECOGNITION") {
        const modes: GameMode[] = ["SCRAMBLE", "MISSING_LINK"];
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        setCurrentGameMode(randomMode);
      } else {
        setCurrentGameMode("SCRIBE");
      }
    }
  }, [currentQuestionIndex, currentPhase, verses]);

  const handleAnswerSubmit = (isCorrect: boolean) => {
    const currentVerse = verses[currentQuestionIndex];
    if (!currentVerse) return;
    
    lessonStore.getState().submitAnswer(isCorrect);
    
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

  const handleFeedbackContinue = () => {
    const wasCorrect = feedbackStatus === "correct";
    setFeedbackStatus("idle");
    
    if (currentPhase === "RECOGNITION") {
      if (wasCorrect) {
        setCurrentPhase("RECALL");
      } else {
        lessonStore.getState().nextQuestion();
      }
    } else {
      setCurrentPhase("RECOGNITION");
      lessonStore.getState().nextQuestion();
    }
  };

  const renderLessonScreen = () => {
    if (isLoading) return <LessonLoader />;
    if (offlineError) return (
      <OfflineError 
        message={offlineError} 
        onRetry={() => lessonStore.getState().loadLesson(verses)} 
      />
    );
    
    const currentVerse = verses[currentQuestionIndex];
    if (!currentVerse) return null;

    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity 
          style={{ padding: 16, backgroundColor: '#eee' }}
          onPress={() => setActiveScreen("path")}
        >
          <Text>← Back to Path (Quit)</Text>
        </TouchableOpacity>
        
        <View style={{ flex: 1, padding: 16 }}>
           {/* Top Header - Only show during exercise phase */}
           {seenIntros.includes(currentVerse.verseReference) && (
             <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
               <Text style={{ fontSize: 20, fontWeight: "bold", color: "#333", flex: 1 }}>
                 Solve: {currentVerse.verseReference}
               </Text>
               {currentVerse.difficulty === "Hard" && (
                 <View style={{ backgroundColor: "#FFEDD5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                   <Text style={{ color: "#C2410C", fontSize: 12, fontWeight: "bold" }}>🔥 Hard</Text>
                 </View>
               )}
             </View>
           )}

           {!seenIntros.includes(currentVerse.verseReference) ? (
             <View style={{ flex: 1, justifyContent: "center" }}>
               <Text style={{ fontSize: 22, fontWeight: "bold", color: "#666", textAlign: "center", marginBottom: 12 }}>
                 Read: {currentVerse.verseReference}
               </Text>
               <Text style={{ fontSize: 24, lineHeight: 34, color: "#444", textAlign: "center", marginBottom: 40 }}>
                 "{currentVerse.verseText}"
               </Text>
               <TouchableOpacity 
                 style={{ backgroundColor: "#4A90D9", padding: 16, borderRadius: 12, alignItems: "center" }}
                 onPress={() => setSeenIntros(prev => [...prev, currentVerse.verseReference])}
               >
                 <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "bold" }}>Continue to Exercise</Text>
               </TouchableOpacity>
             </View>
           ) : (
             <>
               {currentGameMode === "SCRAMBLE" && (
                 <ScrambleQuestion 
                   targetVerse={currentVerse.verseText || ""} 
                   decoyWords={currentVerse.decoyWords} 
                   onSubmit={handleAnswerSubmit}
                 />
               )}
               {currentGameMode === "MISSING_LINK" && (
                 <MissingLinkQuestion 
                   targetVerse={currentVerse.verseText || ""} 
                   decoyWords={currentVerse.decoyWords} 
                   onSubmit={handleAnswerSubmit}
                 />
               )}
               {currentGameMode === "SCRIBE" && (
                 <ScribeQuestion 
                   targetVerse={currentVerse.verseText || ""} 
                   onSubmit={handleAnswerSubmit}
                 />
               )}
             </>
           )}
        </View>
        <CopyrightFooter text={copyrightText} />
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {activeScreen === "path" ? (
        <PathScreen onStartLesson={() => setActiveScreen("lesson")} />
      ) : (
        renderLessonScreen()
      )}
      
      {activeScreen === "lesson" && currentQuestionIndex < verses.length && (
        <GlobalFeedbackSheet
          status={feedbackStatus}
          targetVerseText={verses[currentQuestionIndex]?.verseText || ""}
          onContinue={handleFeedbackContinue}
        />
      )}
      
      <DevMenu />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
});
