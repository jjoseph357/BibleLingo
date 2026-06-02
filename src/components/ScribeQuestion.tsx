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
  const [isSubmitted, setIsSubmitted] = useState(false);

  const targetWords = targetVerse.trim().split(/\s+/);

  const useHint = () => {
    const currentWords = userInput.trim().split(/\s+/).filter(Boolean);
    
    // 1. Find the first mismatch
    let firstMismatchIdx = -1;
    for (let i = 0; i < Math.max(currentWords.length, targetWords.length); i++) {
      const uWord = i < currentWords.length ? normalize(currentWords[i]) : null;
      const tWord = i < targetWords.length ? normalize(targetWords[i]) : null;
      
      if (uWord !== tWord) {
        // If current word has "...", treat it as an incomplete replace, not a match
        if (i < currentWords.length && currentWords[i].endsWith("...")) {
          // It's a hint in progress
        }
        firstMismatchIdx = i;
        break;
      }
    }
    
    if (firstMismatchIdx === -1) return;

    // 2. Determine action type
    let action: 'insert' | 'replace' | 'delete' | 'append' = 'replace';
    
    if (firstMismatchIdx >= currentWords.length) {
      action = 'append';
    } else if (firstMismatchIdx >= targetWords.length) {
      action = 'delete';
    } else {
      const uWord = normalize(currentWords[firstMismatchIdx]);
      const uNext = firstMismatchIdx + 1 < currentWords.length ? normalize(currentWords[firstMismatchIdx + 1]) : null;
      
      const tWord = normalize(targetWords[firstMismatchIdx]);
      const tNext = firstMismatchIdx + 1 < targetWords.length ? normalize(targetWords[firstMismatchIdx + 1]) : null;
      
      if (uNext === tWord) {
        action = 'delete';
      } else if (uWord === tNext) {
        action = 'insert';
      } else {
        action = 'replace';
      }
    }

    // 3. Generate hint text
    let hintText = "";
    if (action !== 'delete') {
      const targetWord = targetWords[firstMismatchIdx];
      const cleanWord = targetWord.replace(/[^a-zA-Z0-9]/g, "");
      
      let currentAttemptClean = "";
      if (action === 'replace') {
        currentAttemptClean = currentWords[firstMismatchIdx].replace(/[^a-zA-Z0-9]/g, "");
      }
      
      let correctChars = 0;
      for (let i = 0; i < Math.min(currentAttemptClean.length, cleanWord.length); i++) {
        if (currentAttemptClean[i].toLowerCase() === cleanWord[i].toLowerCase()) {
          correctChars++;
        } else {
          break;
        }
      }
      
      if (cleanWord.length === 0) {
        hintText = targetWord;
      } else {
        if (isDailyPractice) {
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
          hintText = targetWord;
        }
      }
    }
    
    let newWords = [...currentWords];
    if (action === 'delete') {
      newWords.splice(firstMismatchIdx, 1);
    } else {
      const hintTextWithTag = hintText + "\u200B";
      if (action === 'replace') {
        newWords[firstMismatchIdx] = hintTextWithTag;
      } else if (action === 'insert') {
        newWords.splice(firstMismatchIdx, 0, hintTextWithTag);
      } else if (action === 'append') {
        newWords.push(hintTextWithTag);
      }
    }
    
    setUserInput(newWords.join(" ") + " ");
    setHintsUsed(prev => prev + 1);
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    setIsSubmitted(true);
    const isCorrect = checkScribeAnswer(userInput, targetVerse);
    onSubmit?.(isCorrect, hintsUsed);
  };

  const renderOverlayText = () => {
    if (!userInput) {
      return <Text style={{ color: '#999' }}>Start typing here...</Text>;
    }
    const tokens = userInput.split(/(\s+)/);
    let wordIdx = 0;
    
    return tokens.map((token, i) => {
      if (token.trim() === "") {
        return <Text key={i}>{token}</Text>;
      }
      
      let color = "#333";
      let textDecorationLine: 'none' | 'underline' | 'line-through' = 'none';
      let fontWeight = 'normal';
      
      const isHinted = token.includes('\u200B');
      if (isHinted) {
        color = "#D4891A";
        fontWeight = '700';
      }
      
      if (isSubmitted) {
        const uWord = normalize(token);
        const tWord = wordIdx < targetWords.length ? normalize(targetWords[wordIdx]) : null;
        if (uWord !== tWord) {
           color = "#E53935";
           textDecorationLine = 'underline';
        } else if (!isHinted) {
           color = "#34C759";
        }
      }
      
      wordIdx++;
      return (
        <Text key={i} style={{ color, textDecorationLine, fontWeight: fontWeight as any }}>
          {token.replace(/\u200B/g, '')}
        </Text>
      );
    });
  };

  const tooManyHints = hintsUsed > Math.floor(targetWords.length / 2);
  const allRevealed = checkScribeAnswer(userInput, targetVerse);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Type the verse from memory:</Text>
        <Text style={styles.subLabel}>Capitalization, punctuation, and extra spacing are ignored — just focus on the words!</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.textShared, styles.input]}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            value={userInput}
            onChangeText={(text) => {
              setUserInput(text);
              if (isSubmitted) setIsSubmitted(false);
            }}
            placeholderTextColor="transparent"
            returnKeyType="done"
            selectionColor="#4A90D9"
            onSubmitEditing={Keyboard.dismiss}
            editable={!isSubmitted}
          />
          <Text style={[styles.textShared, styles.overlay]}>
            {renderOverlayText()}
          </Text>
        </View>
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
  inputWrapper: {
    flex: 1,
    maxHeight: 250,
    backgroundColor: "#F9F9F9",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    position: 'relative',
  },
  textShared: {
    padding: 16,
    fontSize: 18,
    lineHeight: 24,
    textAlignVertical: "top",
    margin: 0,
  },
  input: {
    flex: 1,
    color: "transparent",
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
    color: '#333',
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
