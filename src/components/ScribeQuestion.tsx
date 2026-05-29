import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from "react-native";
import { checkScribeAnswer } from "../utils/scribe";
import { FontAwesome5 } from "@expo/vector-icons";

interface ScribeQuestionProps {
  targetVerse: string;
  onSubmit?: (isCorrect: boolean, hintsUsed?: number) => void;
}

export function ScribeQuestion({
  targetVerse,
  onSubmit,
}: ScribeQuestionProps) {
  const [userInput, setUserInput] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);

  const targetWords = targetVerse.trim().split(/\s+/);

  const useHint = () => {
    const currentWords = userInput.trim().split(/\s+/).filter(Boolean);
    const nextWordIndex = currentWords.length;
    if (nextWordIndex >= targetWords.length) return;

    const nextWord = targetWords[nextWordIndex];
    const newInput = userInput.trim() ? userInput.trimEnd() + " " + nextWord : nextWord;
    setUserInput(newInput + " ");
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
    marginBottom: 16,
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
});
