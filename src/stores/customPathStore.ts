import { createStore } from "zustand/vanilla";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VerseItem } from "../types/models";
import { progressStore } from "./progressStore";
import { auth, db } from "../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { decode as atob, encode as btoa } from "base-64";

export interface CustomPathGroup {
  title: string; // e.g. "Session 1"
  verses: VerseItem[];
}

export interface CustomPath {
  id: string; // unique ID for the path
  title: string; // e.g. "Summer Conference"
  groups: CustomPathGroup[];
}

interface CustomPathState {
  paths: CustomPath[];
  selectedPathId: string | null;
  setSelectedPathId: (id: string | null) => void;
  loadPaths: () => Promise<void>;
  createPath: (title: string, groups: CustomPathGroup[], injectToLibrary?: boolean) => Promise<void>;
  updatePath: (id: string, title: string, groups: CustomPathGroup[], injectToLibrary?: boolean) => Promise<void>;
  addLessonToPath: (pathId: string, group: CustomPathGroup, injectToLibrary?: boolean) => Promise<void>;
  updateLessonInPath: (pathId: string, groupIndex: number, group: CustomPathGroup, injectToLibrary?: boolean) => Promise<void>;
  deleteLessonFromPath: (pathId: string, groupIndex: number) => Promise<void>;
  deletePath: (id: string) => Promise<void>;
  importPath: (base64Str: string, injectToLibrary?: boolean) => Promise<boolean>;
  exportPath: (id: string) => string | null;
  syncToCloud: () => Promise<void>;
}

export const customPathStore = createStore<CustomPathState>((set, get) => ({
  paths: [],
  selectedPathId: null,

  setSelectedPathId: (id: string | null) => {
    set({ selectedPathId: id });
  },

  loadPaths: async () => {
    try {
      // First try to load from local storage for fast boot
      const localData = await AsyncStorage.getItem("customPaths");
      if (localData) {
        set({ paths: JSON.parse(localData) });
      }

      // Then try to fetch from cloud if logged in
      if (auth?.currentUser) {
        const uid = auth.currentUser.uid;
        const cloudDoc = await getDoc(doc(db, 'users', uid, 'data', 'customPaths'));
        if (cloudDoc.exists()) {
          const data = cloudDoc.data();
          if (data.paths) {
            set({ paths: data.paths });
            await AsyncStorage.setItem("customPaths", JSON.stringify(data.paths));
          }
        }
      }
    } catch (e) {
      console.error("Failed to load custom paths", e);
    }
  },

  syncToCloud: async () => {
    try {
      if (auth?.currentUser) {
        const uid = auth.currentUser.uid;
        await setDoc(doc(db, 'users', uid, 'data', 'customPaths'), {
          paths: get().paths
        }, { merge: true });
      }
    } catch (e) {
      console.error("Failed to sync custom paths to cloud", e);
    }
  },

  createPath: async (title: string, groups: CustomPathGroup[], injectToLibrary = true) => {
    try {
      const newPath: CustomPath = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        title,
        groups,
      };
      
      const newPaths = [...get().paths, newPath];
      set({ paths: newPaths });
      await AsyncStorage.setItem("customPaths", JSON.stringify(newPaths));
      get().syncToCloud();

      // Inject all verses into progressStore if opted in
      if (injectToLibrary) {
        const versesToInject = groups.flatMap(g => g.verses);
        progressStore.getState().injectCustomVerses(versesToInject);
      }
    } catch (e) {
      console.error("Failed to create custom path", e);
    }
  },

  updatePath: async (id: string, title: string, groups: CustomPathGroup[], injectToLibrary = true) => {
    try {
      const paths = get().paths;
      const index = paths.findIndex(p => p.id === id);
      if (index === -1) return;

      const updatedPath: CustomPath = { ...paths[index], title, groups };
      const newPaths = [...paths];
      newPaths[index] = updatedPath;

      set({ paths: newPaths });
      await AsyncStorage.setItem("customPaths", JSON.stringify(newPaths));
      get().syncToCloud();

      if (injectToLibrary) {
        const versesToInject = groups.flatMap(g => g.verses);
        progressStore.getState().injectCustomVerses(versesToInject);
      }
    } catch (e) {
      console.error("Failed to update custom path", e);
    }
  },

  deletePath: async (id: string) => {
    try {
      const newPaths = get().paths.filter(p => p.id !== id);
      set({ paths: newPaths });
      await AsyncStorage.setItem("customPaths", JSON.stringify(newPaths));
      get().syncToCloud();
    } catch (e) {
      console.error("Failed to delete custom path", e);
    }
  },

  addLessonToPath: async (pathId: string, group: CustomPathGroup, injectToLibrary = true) => {
    try {
      const paths = get().paths;
      const index = paths.findIndex(p => p.id === pathId);
      if (index === -1) return;

      const newPaths = [...paths];
      newPaths[index].groups = [...newPaths[index].groups, group];

      set({ paths: newPaths });
      await AsyncStorage.setItem("customPaths", JSON.stringify(newPaths));
      get().syncToCloud();

      if (injectToLibrary) {
        progressStore.getState().injectCustomVerses(group.verses);
      }
    } catch (e) {
      console.error("Failed to add lesson to custom path", e);
    }
  },

  updateLessonInPath: async (pathId: string, groupIndex: number, group: CustomPathGroup, injectToLibrary = true) => {
    try {
      const paths = get().paths;
      const pathIndex = paths.findIndex(p => p.id === pathId);
      if (pathIndex === -1) return;

      const newPaths = [...paths];
      const newGroups = [...newPaths[pathIndex].groups];
      newGroups[groupIndex] = group;
      newPaths[pathIndex].groups = newGroups;

      set({ paths: newPaths });
      await AsyncStorage.setItem("customPaths", JSON.stringify(newPaths));
      get().syncToCloud();

      if (injectToLibrary) {
        progressStore.getState().injectCustomVerses(group.verses);
      }
    } catch (e) {
      console.error("Failed to update lesson in custom path", e);
    }
  },

  deleteLessonFromPath: async (pathId: string, groupIndex: number) => {
    try {
      const paths = get().paths;
      const pathIndex = paths.findIndex(p => p.id === pathId);
      if (pathIndex === -1) return;

      const newPaths = [...paths];
      const newGroups = [...newPaths[pathIndex].groups];
      newGroups.splice(groupIndex, 1);
      newPaths[pathIndex].groups = newGroups;

      set({ paths: newPaths });
      await AsyncStorage.setItem("customPaths", JSON.stringify(newPaths));
      get().syncToCloud();
    } catch (e) {
      console.error("Failed to delete lesson from custom path", e);
    }
  },

  importPath: async (base64Str: string, injectToLibrary = true) => {
    try {
      // Basic decoding and parsing
      const jsonStr = atob(base64Str);
      const parsed = JSON.parse(jsonStr) as CustomPath;
      
      if (!parsed.id || !parsed.title || !parsed.groups) {
        return false;
      }

      // Reassign a new ID so we don't conflict with local ones
      parsed.id = Date.now().toString() + Math.random().toString(36).substring(7);

      const newPaths = [...get().paths, parsed];
      set({ paths: newPaths });
      await AsyncStorage.setItem("customPaths", JSON.stringify(newPaths));
      get().syncToCloud();

      // Inject verses if opted in
      if (injectToLibrary) {
        const versesToInject = parsed.groups.flatMap(g => g.verses);
        progressStore.getState().injectCustomVerses(versesToInject);
      }
      
      return true;
    } catch (e) {
      console.error("Failed to import custom path", e);
      return false;
    }
  },

  exportPath: (id: string) => {
    const path = get().paths.find(p => p.id === id);
    if (!path) return null;
    
    try {
      const jsonStr = JSON.stringify(path);
      return btoa(jsonStr);
    } catch (e) {
      console.error("Failed to export custom path", e);
      return null;
    }
  }
}));
