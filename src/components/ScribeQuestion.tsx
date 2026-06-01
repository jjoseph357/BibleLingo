import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from "react-native";
import { checkScribeAnswer, normalize } from "../utils/scribe";
import { FontAwesome5 } from "@expo/vector-icons";

interface ScribeQuestionProps {
  targetVerse: string;
  isDailyPractice?: boolean;
  onSubmit?: (isCorrect: boolean, hintsUsed?: number) => void;
}

export function ScribeQuestion({
  targetVerse,
  isDailyPractice = false,
  onSubmit,
}: ScribeQuestionProps) {
  const [userInput, setUserInput] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);

  const targetWords = targetVerse.trim().split(/\s+/);

  const useHint = () => {
    const currentWords = userInput.trim().split(/\s+/).filter(Boolean);
    
    // 1. Align currentWords to targetWords
    let targetIdx = 0;
    const mappedIndices: number[] = [];
    
    for (let j = 0; j < currentWords.length; j++) {
      const userWord = normalize(currentWords[j]);
      let found = false;
      for (let i = targetIdx; i < targetWords.length; i++) {
        if (normalize(targetWords[i]) === userWord && !currentWords[j].endsWith("...")) {
          mappedIndices[j] = i;
          targetIdx = i + 1;
          found = true;
          break;
        }
      }
      if (!found) {
        mappedIndices[j] = Math.min(targetIdx, targetWords.length - 1);
        targetIdx = Math.min(targetIdx + 1, targetWords.length);
      }
    }
    
    // 2. Find the first missed or incorrect target word
    let firstMismatchTargetIdx = -1;
    let isReplacement = false;
    let replacementCurrentIdx = -1;
    let insertionCurrentIdx = -1;
    
    for (let i = 0; i < targetWords.length; i++) {
      const currentWordIdx = mappedIndices.indexOf(i);
      if (currentWordIdx === -1) {
        firstMismatchTargetIdx = i;
        let insertPos = 0;
        for (let j = 0; j < currentWords.length; j++) {
          if (mappedIndices[j] < i) {
            insertPos = j + 1;
          }
        }
        insertionCurrentIdx = insertPos;
        break;
      } else {
        if (normalize(currentWords[currentWordIdx]) !== normalize(targetWords[i])) {
          firstMismatchTargetIdx = i;
          isReplacement = true;
          replacementCurrentIdx = currentWordIdx;
          break;
        }
      }
    }
    
    if (firstMismatchTargetIdx === -1) {
      if (currentWords.length < targetWords.length) {
        firstMismatchTargetIdx = currentWords.length;
      } else {
        return;
      }
    }
    
    // 3. Hint text: progressive reveal
    const targetWord = targetWords[firstMismatchTargetIdx];
    const cleanWord = targetWord.replace(/[^a-zA-Z0-9]/g, "");
    
    let currentAttemptClean = "";
    if (isReplacement && replacementCurrentIdx !== -1) {
      currentAttemptClean = currentWords[replacementCurrentIdx].replace(/[^a-zA-Z0-9]/g, "");
    }
    
    let correctChars = 0;
    for (let i = 0; i < Math.min(currentAttemptClean.length, cleanWord.length); i++) {
      if (currentAttemptClean[i].toLowerCase() === cleanWord[i].toLowerCase()) {
        correctChars++;
      } else {
        break;
      }
    }
    
    let hintText = "";
    if (cleanWord.length === 0) {
      hintText = targetWord;
    } else {
      if (isDailyPractice) {
        // Daily practice: provide progressive letter hints
        let charsToReveal = correctChars + 1;
        let targetPrefix = "";
        let alphaCount = 0;
        for (let i = 0; i < targetWord.length; i++) {
          targetPrefix += targetWord[i];
          if (/[a-zA-Z0-9]/.test(targetWord[i])) {
            alphaCount++;
          }
          if (alphaCount >= charsToReveal) {
            break;
          }
        }
        
        if (alphaCount >= cleanWord.length) {
          hintText = targetWord;
        } else {
          hintText = `${targetPrefix}...`;
        }
      } else {
        // Lesson mode: provide the whole word
        hintText = targetWord;
      }
    }
    
    // 4. Update the input
    let newWords = [...currentWords];
    if (isReplacement && replacementCurrentIdx !== -1) {
      newWords[replacementCurrentIdx] = hintText;
    } else if (insertionCurrentIdx !== -1) {
      newWords.splice(insertionCurrentIdx, 0, hintText);
    } else {
      newWords.push(hintText);
    }
    
    setUserInput(newWords.join(" ") + " ");
    setHintsUsed(prev => prev + 1);
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    const isCorrect = checkScribeAnswer(userInput, targetVerse);
    onSubmit?.(isCorrect, hintsUsed);
  };

  const tooManyHints = hintsUsed > Math.floor(targetWords.length / 2);
  const allRevealed = userInput.trim().split(/\s+/).filter(Boolean).length >= targetWords.length;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Type the verse from memory:</Text>
        <Text style={styles.subLabel}>Capitalization, punctuation, and extra spacing are ignored — just focus on the words!</Text>
        <TextInput
          style={styles.input}
          multiline
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Start typing here..."
          placeholderTextColor="#999"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>

      {/* Hint Information Banner */}
      <View style={styles.infoBanner}>
        <FontAwesome5 name="info-circle" size={12} color="#666" style={{ marginRight: 6 }} />
        <Text style={styles.infoText}>
          Each hint used deducts 1 XP when solved. Max hints: {Math.floor(targetWords.length / 2)} (Remaining: {Math.max(0, Math.floor(targetWords.length / 2) - hintsUsed)}).
        </Text>
      </View>

      {onSubmit && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.hintButton, allRevealed && styles.hintButtonDisabled]}
            onPress={useHint}
            disabled={allRevealed}
          >
            <FontAwesome5 name="lightbulb" size={16} color={allRevealed ? "#A0A0A0" : "#F5A623"} />
            <Text style={[styles.hintText, allRevealed && styles.hintTextDisabled]}>
              Hint{hintsUsed > 0 ? ` (${hintsUsed})` : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, !userInput.trim() && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!userInput.trim()}
          >
            <Text style={styles.submitText}>Check</Text>
          </TouchableOpacity>
        </View>
      )}

      {tooManyHints && (
        <Text style={styles.warningText}>
          Too many hints — this will count as a redo.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  inputContainer: {
    flex: 1,
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 13,
    color: "#6E7781",
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    flex: 1,
    maxHeight: 250,
    backgroundColor: "#F9F9F9",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: "#333",
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#FFE0B2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  hintButtonDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
  },
  hintText: {
    color: "#D4891A",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  hintTextDisabled: {
    color: "#A0A0A0",
  },
  submitButton: {
    backgroundColor: "#34C759",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  submitText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  warningText: {
    textAlign: "center",
    color: "#FF9500",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    flex: 1,
  },
});
