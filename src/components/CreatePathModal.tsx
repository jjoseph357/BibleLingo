import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { customPathStore, CustomPath } from "../stores/customPathStore";

interface Props {
  visible: boolean;
  onClose: () => void;
  editingPath?: CustomPath;
}

export function CreatePathModal({ visible, onClose, editingPath }: Props) {
  const [pathName, setPathName] = useState("");

  useEffect(() => {
    if (visible) {
      if (editingPath) {
        setPathName(editingPath.title);
      } else {
        setPathName("");
      }
    }
  }, [visible, editingPath]);

  const handleSave = () => {
    if (!pathName.trim()) return;
    
    if (editingPath) {
      customPathStore.getState().updatePath(editingPath.id, pathName.trim(), editingPath.groups);
    } else {
      customPathStore.getState().createPath(pathName.trim(), []);
    }
    
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{editingPath ? "Rename Playlist" : "Create Playlist"}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <FontAwesome5 name="times" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={styles.label}>Playlist Name</Text>
            <TextInput 
              style={styles.input} 
              value={pathName} 
              onChangeText={setPathName} 
              placeholder="e.g. Summer Conference" 
              placeholderTextColor="#94A3B8" 
              autoFocus
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, !pathName.trim() && styles.disabledBtn]} 
            onPress={handleSave} 
            disabled={!pathName.trim()}
          >
            <Text style={styles.saveButtonText}>{editingPath ? "Save Name" : "Create Playlist"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1E293B",
  },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.5,
  }
});
