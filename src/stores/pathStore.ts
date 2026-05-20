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
import sstjh from "../data/lessons/sst-gr-7-9.json";
import ssths from "../data/lessons/sst-gr-10-12.json";

export const ALL_LESSONS = [...sstjh, ...ssths, ...eog1, ...eog2, ...becl] as VerseItem[];

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

  for (const [bookPath, unitsMap] of booksMap.entries()) {
    const unitsData: GroupedUnit[] = [];
    let foundCurrent = false;
    let isFirstInBook = true;

    for (const [unitTitle, lessons] of unitsMap.entries()) {
      const unitId = `${bookPath}-${unitTitle}`;
      const isUnitCompleted =
        lessons.every((l) => completedVerseRefs.has(l.verseReference)) ||
        progressStore.getState().lessonSessions[unitId]?.status === "completed";

      let status: UnitStatus = "locked";

      if (isAllUnlocked) {
        status = isUnitCompleted ? "completed" : "current";
      } else if (isUnitCompleted) {
        status = "completed";
      } else if (!foundCurrent) {
        status = "current";
        foundCurrent = true;
      }

      // The very first lesson of any book is always unlocked if not completed
      if (isFirstInBook && status === "locked") {
        status = "current";
        foundCurrent = true;
      }
      isFirstInBook = false;

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
