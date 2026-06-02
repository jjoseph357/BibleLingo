import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Dimensions, Animated } from "react-native";
import * as Clipboard from "expo-clipboard";
import { FontAwesome5 } from "@expo/vector-icons";
import { useStore } from "zustand";
import { customPathStore, CustomPath, CustomPathGroup } from "../stores/customPathStore";
import { lessonStore } from "../stores/lessonStore";
import { progressStore } from "../stores/progressStore";
import { CreatePathModal } from "./CreatePathModal";
import { EditLessonModal } from "./EditLessonModal";
import { getNodeX, generateDecorations } from "./FoliageDecorations";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PATH_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);
const NODE_SIZE = 62;
const NODE_SPACING_Y = 110;

// ── Node Rendering Component ──────────────────────────────────────────────
interface StoneNodeProps {
  group: CustomPathGroup;
  index: number;
  isMastered: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function StoneNode({ group, index, isMastered, onPlay, onEdit, onDelete }: StoneNodeProps) {
  const x = getNodeX(index);
  const y = index * NODE_SPACING_Y;

  // Visual state
  const colors = isMastered
    ? { bg: "#F5A623", border: "#D4891A", text: "#FFF", shadow: "#D4891A" }
    : { bg: "#4A90D9", border: "#356BA6", text: "#FFF", shadow: "#356BA6" };

  return (
    <View style={{ position: "absolute", left: x, top: y, width: NODE_SIZE, alignItems: "center", zIndex: 10 }}>
      {/* Edit/Delete Actions (Floating next to node) */}
      <View style={{ position: "absolute", right: -40, top: 0, gap: 8 }}>
        <TouchableOpacity style={styles.miniActionBtn} onPress={onEdit}>
          <FontAwesome5 name="edit" size={12} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.miniActionBtn, { backgroundColor: "#FEE2E2" }]} onPress={onDelete}>
          <FontAwesome5 name="trash" size={12} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.7} onPress={onPlay} style={{ alignItems: "center" }}>
        <View style={{ width: NODE_SIZE, height: NODE_SIZE, position: "relative" }}>
          <View style={{ width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, backgroundColor: colors.shadow, position: "absolute", top: 4, left: 0 }} />
          <View style={{
            width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
            backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.border,
            alignItems: "center", justifyContent: "center",
            shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
          }}>
            <View style={{ position: "absolute", top: 5, left: 8, width: NODE_SIZE * 0.55, height: NODE_SIZE * 0.3, borderRadius: NODE_SIZE * 0.3, backgroundColor: "rgba(255,255,255,0.25)" }} />
            {isMastered ? (
              <FontAwesome5 name="check" size={22} color={colors.text} />
            ) : (
              <FontAwesome5 name="play" size={16} color={colors.text} style={{ marginLeft: 2 }} />
            )}
          </View>
        </View>
        <View style={styles.nodeLabel}>
          <Text style={styles.nodeLabelText}>{group.title}</Text>
          <Text style={styles.nodeSubtext}>{group.verses.length} verses</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}


// ── Main Screen ────────────────────────────────────────────────────────
interface Props {
  onStartLesson?: () => void;
}

export function CustomPathsScreen({ onStartLesson }: Props) {
  const paths = useStore(customPathStore, (s) => s.paths);
  // UI State
  const selectedPathId = useStore(customPathStore, (s) => s.selectedPathId);
  const { loadPaths, deletePath, importPath, exportPath, deleteLessonFromPath, setSelectedPathId } = customPathStore.getState();
  const lessonSessions = useStore(progressStore, (s) => s.lessonSessions);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingPath, setEditingPath] = useState<CustomPath | undefined>(undefined);

  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | undefined>(undefined);
  const [editingGroup, setEditingGroup] = useState<CustomPathGroup | undefined>(undefined);

  useEffect(() => {
    loadPaths();
  }, []);

  const selectedPath = useMemo(() => paths.find(p => p.id === selectedPathId), [paths, selectedPathId]);

  // Actions
  const handleExport = (id: string) => {
    const code = exportPath(id);
    if (code) {
      Clipboard.setString(code);
      progressStore.getState().showToast("Path code copied to clipboard!");
    }
  };

  const handleImport = async () => {
    try {
      const code = await Clipboard.getStringAsync();
      if (!code) { progressStore.getState().showToast("No code found in clipboard."); return; }
      if (await importPath(code)) progressStore.getState().showToast("Custom path imported successfully!");
      else progressStore.getState().showToast("Invalid or corrupted path code.");
    } catch (e) {
      progressStore.getState().showToast("Failed to access clipboard.");
    }
  };

  const handleDeletePath = (id: string, title: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to delete "${title}"?`)) { deletePath(id); if (selectedPathId === id) setSelectedPathId(null); }
    } else {
      Alert.alert("Delete Path", `Are you sure you want to delete "${title}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => { deletePath(id); if (selectedPathId === id) setSelectedPathId(null); } }
      ]);
    }
  };

  const handleDeleteLesson = (groupIndex: number, title: string) => {
    if (!selectedPathId) return;
    if (Platform.OS === "web") {
      if (window.confirm(`Delete lesson stone "${title}"?`)) deleteLessonFromPath(selectedPathId, groupIndex);
    } else {
      Alert.alert("Delete Lesson", `Delete lesson stone "${title}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteLessonFromPath(selectedPathId, groupIndex) }
      ]);
    }
  };

  const handlePlayGroup = (pathId: string, group: CustomPathGroup) => {
    if (!onStartLesson) return;
    const lessonId = `${pathId}-${group.title}`;
    const session = lessonSessions[lessonId];
    const isMastered = session?.status === "completed";
    lessonStore.getState().loadLesson(group.verses, isMastered, lessonId, true);
    onStartLesson();
  };

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.scroll}>
      {paths.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome5 name="folder-open" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Custom Paths</Text>
          <Text style={styles.emptyDesc}>Create a custom playlist to hyper-focus on specific verses for conferences or events.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => { setEditingPath(undefined); setCreateModalVisible(true); }}>
            <Text style={styles.createBtnText}>Create New Path</Text>
          </TouchableOpacity>
        </View>
      ) : (
        paths.map(path => (
          <TouchableOpacity key={path.id} style={styles.worldCard} onPress={() => setSelectedPathId(path.id)} activeOpacity={0.8}>
            <View style={styles.worldContent}>
              <View style={styles.worldIconBox}>
                <FontAwesome5 name="map" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.worldTitle}>{path.title}</Text>
                <Text style={styles.worldDesc}>{path.groups.length} Lesson Stones</Text>
              </View>
            </View>
            <View style={styles.worldActions}>
              <TouchableOpacity style={styles.playPathBtn} onPress={() => setSelectedPathId(path.id)}>
                <FontAwesome5 name="play" size={14} color="#FFF" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingPath(path); setCreateModalVisible(true); }}>
                  <FontAwesome5 name="edit" size={16} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleExport(path.id)}>
                  <FontAwesome5 name="share-alt" size={16} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeletePath(path.id, path.title)}>
                  <FontAwesome5 name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderPathView = () => {
    if (!selectedPath) return null;
    const nodeCount = selectedPath.groups.length;
    const canvasHeight = Math.max(SCREEN_WIDTH, nodeCount * NODE_SPACING_Y + 180);
    const yArray = Array.from({ length: nodeCount }, (_, i) => i * NODE_SPACING_Y);
    const decorations = generateDecorations(yArray, 0);

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedPathId(null)}>
          <FontAwesome5 name="arrow-left" size={16} color="#64748B" />
          <Text style={styles.backBtnText}>Back to Playlists</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.pathHeaderCard}>
            <Text style={styles.pathTitleLarge}>{selectedPath.title}</Text>
            <Text style={styles.pathDescLarge}>All stones are unlocked. Complete them in any order!</Text>
          </View>

          <View style={[styles.pathCanvas, { height: canvasHeight, width: PATH_WIDTH }]}>
            {/* Render Foliage Decorations in background */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
              {decorations}
            </View>

            {selectedPath.groups.map((group, idx) => {
              const lessonId = `${selectedPath.id}-${group.title}`;
              const session = lessonSessions[lessonId];
              const isMastered = session?.status === "completed";

              return (
                <StoneNode
                  key={idx}
                  group={group}
                  index={idx}
                  isMastered={isMastered}
                  onPlay={() => handlePlayGroup(selectedPath.id, group)}
                  onEdit={() => { setEditingGroup(group); setEditingGroupIndex(idx); setLessonModalVisible(true); }}
                  onDelete={() => handleDeleteLesson(idx, group.title)}
                />
              );
            })}

            {/* Add Lesson Stone Button placed at the very end of the path */}
            <View style={{ position: "absolute", top: selectedPath.groups.length * NODE_SPACING_Y, left: 0, width: PATH_WIDTH, alignItems: "center", marginTop: 40 }}>
              <TouchableOpacity style={styles.addStoneBtn} onPress={() => { setEditingGroup(undefined); setEditingGroupIndex(undefined); setLessonModalVisible(true); }}>
                <FontAwesome5 name="plus" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.addStoneBtnText}>Add Lesson Stone</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{selectedPathId ? selectedPath?.title : "Custom Playlists"}</Text>
        {!selectedPathId && (
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleImport}>
              <FontAwesome5 name="file-import" size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditingPath(undefined); setCreateModalVisible(true); }}>
              <FontAwesome5 name="plus" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {selectedPathId ? renderPathView() : renderDashboard()}

      <CreatePathModal
        visible={createModalVisible}
        onClose={() => { setCreateModalVisible(false); setEditingPath(undefined); }}
        editingPath={editingPath}
      />

      {selectedPathId && (
        <EditLessonModal
          visible={lessonModalVisible}
          onClose={() => { setLessonModalVisible(false); setEditingGroup(undefined); setEditingGroupIndex(undefined); }}
          pathId={selectedPathId}
          editingGroup={editingGroup}
          editingGroupIndex={editingGroupIndex}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  iconBtn: {
    backgroundColor: "#EFF6FF",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#475569",
    marginTop: 16,
  },
  emptyDesc: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  createBtn: {
    marginTop: 24,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createBtnText: {
    color: "#FFF",
    fontWeight: "800",
  },
  // ── Dashboard World Cards ─────────────────
  worldCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  worldContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  worldIconBox: {
    backgroundColor: "#4A90D9",
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4A90D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  worldTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  worldDesc: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  worldActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  playPathBtn: {
    backgroundColor: "#4A90D9",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtn: {
    padding: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  // ── Path View UI ─────────────────
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtnText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  pathHeaderCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pathTitleLarge: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  pathDescLarge: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "500",
  },
  pathCanvas: {
    alignSelf: "center",
    position: "relative",
  },
  nodeLabel: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 160,
    maxWidth: 240,
  },
  nodeLabelText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
  },
  nodeSubtext: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
  },
  miniActionBtn: {
    backgroundColor: "#EFF6FF",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addStoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addStoneBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16,
  }
});
