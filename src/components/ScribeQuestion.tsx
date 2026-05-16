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

interface ScribeQuestionProps {
  targetVerse: string;
  onSubmit?: (isCorrect: boolean) => void;
}

export function ScribeQuestion({
  targetVerse,
  onSubmit,
}: ScribeQuestionProps) {
  const [userInput, setUserInput] = useState("");

  const handleSubmit = () => {
    Keyboard.dismiss();
    const isCorrect = checkScribeAnswer(userInput, targetVerse);
    onSubmit?.(isCorrect);
  };

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
        <TouchableOpacity 
          style={[styles.submitButton, !userInput.trim() && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={!userInput.trim()}
        >
          <Text style={styles.submitText}>Check</Text>
        </TouchableOpacity>
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
  submitButton: {
    alignSelf: "center",
    backgroundColor: "#34C759",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  submitText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
