jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { progressStore } from "../progressStore";
import { pathStore } from "../pathStore";
import { lessonStore } from "../lessonStore";
import { UserProgress } from "../../types/models";

// ── Progress Store ───────────────────────────────────────────

describe("progressStore", () => {
  beforeEach(() => {
    progressStore.getState().reset();
  });

  test("addOrUpdate inserts a new entry", () => {
    const entry: UserProgress = {
      verseReference: "Romans 8:1",
      intervalDays: 1,
      nextReviewDate: "2026-05-20T12:00:00.000Z",
      repetitions: 1,
    };
    progressStore.getState().addOrUpdate(entry);
    expect(progressStore.getState().entries).toHaveLength(1);
    expect(progressStore.getState().entries[0].verseReference).toBe("Romans 8:1");
  });

  test("addOrUpdate updates an existing entry by verseReference", () => {
    const entry: UserProgress = {
      verseReference: "Romans 8:1",
      intervalDays: 1,
      nextReviewDate: "2026-05-20T12:00:00.000Z",
      repetitions: 1,
    };
    progressStore.getState().addOrUpdate(entry);
    progressStore.getState().addOrUpdate({ ...entry, intervalDays: 4, repetitions: 2 });

    expect(progressStore.getState().entries).toHaveLength(1);
    expect(progressStore.getState().entries[0].intervalDays).toBe(4);
  });

  test("fastForward subtracts days from all nextReviewDate timestamps", () => {
    progressStore.getState().addOrUpdate({
      verseReference: "Romans 8:1",
      intervalDays: 4,
      nextReviewDate: "2026-05-20T12:00:00.000Z",
      repetitions: 2,
    });
    progressStore.getState().addOrUpdate({
      verseReference: "Romans 1:1",
      intervalDays: 2,
      nextReviewDate: "2026-05-18T12:00:00.000Z",
      repetitions: 1,
    });

    progressStore.getState().fastForward(3);

    const entries = progressStore.getState().entries;
    // May 20 - 3 days = May 17
    expect(entries[0].nextReviewDate).toBe(new Date("2026-05-17T12:00:00.000Z").toISOString());
    // May 18 - 3 days = May 15
    expect(entries[1].nextReviewDate).toBe(new Date("2026-05-15T12:00:00.000Z").toISOString());
  });

  test("reset clears all entries", () => {
    progressStore.getState().addOrUpdate({
      verseReference: "Romans 8:1",
      intervalDays: 1,
      nextReviewDate: "2026-05-20T12:00:00.000Z",
      repetitions: 1,
    });
    progressStore.getState().reset();
    expect(progressStore.getState().entries).toHaveLength(0);
  });
});

// ── Path Store ───────────────────────────────────────────────

describe("pathStore", () => {
  beforeEach(() => {
    pathStore.getState().reset();
  });

  test("unlock all path nodes overrides path state", () => {
    pathStore.getState().unlockAll();
    const isAllUnlocked = pathStore.getState().isAllUnlocked;
    expect(isAllUnlocked).toBe(true);
  });

  test("reset all data locks path nodes", () => {
    pathStore.getState().reset();
    const isAllUnlocked = pathStore.getState().isAllUnlocked;
    expect(isAllUnlocked).toBe(false);
  });
});

// ── Force Win via lessonStore.setState ────────────────────────

describe("DevMenu: force win", () => {
  test("setState directly marks lesson complete with full score", () => {
    const verses = [
      {
        lessonId: "dev-01",
        bookPath: "Test",
        unitTitle: "Ch1",
        verseReference: "Test 1:1",
        verseText: "test",
        themeTags: [],
        difficulty: "Easy" as const,
        decoyWords: [],
      },
      {
        lessonId: "dev-02",
        bookPath: "Test",
        unitTitle: "Ch1",
        verseReference: "Test 1:2",
        verseText: "test",
        themeTags: [],
        difficulty: "Easy" as const,
        decoyWords: [],
      },
    ];

    lessonStore.getState().startLesson(verses);

    // This is exactly what DevMenu.forceWin() does:
    lessonStore.setState({
      score: lessonStore.getState().verses.length,
      isLessonComplete: true,
    });

    const s = lessonStore.getState();
    expect(s.isLessonComplete).toBe(true);
    expect(s.score).toBe(2);
  });
});
