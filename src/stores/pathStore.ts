// ============================================================
// Path Store — Derived Unit Node State
// ============================================================

import { createStore } from "zustand/vanilla";
import { UnitNode, UnitStatus } from "../types/unit";
import { VerseItem } from "../types/models";
import { progressStore } from "./progressStore";

import eog1 from "../data/lessons/the-economy-of-god.json";
import eog2 from "../data/lessons/the-economy-of-god-2.json";
import becl from "../data/lessons/basic-elements-of-the-christian-life.json";

export const ALL_LESSONS = [...eog1, ...eog2, ...becl] as VerseItem[];

export interface GroupedUnit extends Omit<UnitNode, "id"> {
  id: string; // unique string for SectionList key
  lessons: VerseItem[];
}

export interface BookSection {
  title: string;
  data: GroupedUnit[];
}

export interface PathState {
  isAllUnlocked: boolean;

  unlockAll: () => void;
  reset: () => void;
}

export const pathStore = createStore<PathState>((set) => ({
  isAllUnlocked: false,

  unlockAll: () => set({ isAllUnlocked: true }),

  reset: () => set({ isAllUnlocked: false }),
}));

/**
 * Derives the path sections from raw JSON lessons and user progress.
 */
export function getGroupedLessons(): BookSection[] {
  const { isAllUnlocked } = pathStore.getState();
  const progressEntries = progressStore.getState().entries;
  
  // A verse is "completed" if they've answered it correctly at least once (interval > 0)
  const completedVerseRefs = new Set(
    progressEntries.filter((e) => e.intervalDays > 0).map((e) => e.verseReference)
  );

  // 1. Group lessons by bookPath -> unitTitle
  const booksMap = new Map<string, Map<string, VerseItem[]>>();
  
  for (const lesson of ALL_LESSONS) {
    if (!booksMap.has(lesson.bookPath)) {
      booksMap.set(lesson.bookPath, new Map());
    }
    const unitsMap = booksMap.get(lesson.bookPath)!;
    if (!unitsMap.has(lesson.unitTitle)) {
      unitsMap.set(lesson.unitTitle, []);
    }
    unitsMap.get(lesson.unitTitle)!.push(lesson);
  }

  // 2. Determine unit statuses
  const sections: BookSection[] = [];
  let foundCurrent = false;

  for (const [bookPath, unitsMap] of booksMap.entries()) {
    const unitsData: GroupedUnit[] = [];
    
    for (const [unitTitle, lessons] of unitsMap.entries()) {
      const isUnitCompleted = lessons.every((l) => completedVerseRefs.has(l.verseReference));
      
      let status: UnitStatus = "locked";
      
      if (isAllUnlocked) {
        status = isUnitCompleted ? "completed" : "current"; // If unlocked, incomplete ones are "current" (clickable)
      } else if (isUnitCompleted) {
        status = "completed";
      } else if (!foundCurrent) {
        status = "current";
        foundCurrent = true;
      }

      unitsData.push({
        id: `${bookPath}-${unitTitle}`,
        title: unitTitle,
        bookPath,
        status,
        lessons,
      });
    }

    sections.push({
      title: bookPath,
      data: unitsData,
    });
  }

  return sections;
}
