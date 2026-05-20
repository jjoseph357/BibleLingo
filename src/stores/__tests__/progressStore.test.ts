// ============================================================
// Progress Store — Unit Tests
// ============================================================

// Mock AsyncStorage to work in Node.js environment
jest.mock("@react-native-async-storage/async-storage", () => {
  const mockStorage: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        for (const key in mockStorage) {
          delete mockStorage[key];
        }
        return Promise.resolve();
      }),
    }
  };
});

import { progressStore } from "../progressStore";

describe("progressStore", () => {
  beforeEach(() => {
    progressStore.getState().reset();
  });

  test("saveLessonSession saves in-progress session details correctly", () => {
    const { saveLessonSession } = progressStore.getState();
    const masteryMock = {
      "2 Cor. 13:14": { level: 2, completedModes: ["SCRAMBLE"] },
      "Matt. 28:19": { level: 0, completedModes: [] },
    };
    const stepIndexMock = {
      "2 Cor. 13:14": 3,
      "Matt. 28:19": 0,
    };

    saveLessonSession("test-lesson-id", {
      verseMastery: masteryMock as any,
      verseStepIndex: stepIndexMock,
      progressPercentage: 0.25,
    });

    const s = progressStore.getState();
    expect(s.lessonSessions["test-lesson-id"]).toBeDefined();
    expect(s.lessonSessions["test-lesson-id"].status).toBe("in_progress");
    expect(s.lessonSessions["test-lesson-id"].verseMastery).toEqual(masteryMock);
    expect(s.lessonSessions["test-lesson-id"].verseStepIndex).toEqual(stepIndexMock);
    expect(s.lessonSessions["test-lesson-id"].progressPercentage).toBe(0.25);
  });

  test("completeLessonSession marks a session as completed", () => {
    const { saveLessonSession, completeLessonSession } = progressStore.getState();
    const masteryMock = {
      "2 Cor. 13:14": { level: 4, completedModes: [] },
    };
    const stepIndexMock = {
      "2 Cor. 13:14": 6,
    };

    saveLessonSession("test-lesson-id", {
      verseMastery: masteryMock as any,
      verseStepIndex: stepIndexMock,
      progressPercentage: 0.5,
    });

    completeLessonSession("test-lesson-id");

    const s = progressStore.getState();
    expect(s.lessonSessions["test-lesson-id"].status).toBe("completed");
    expect(s.lessonSessions["test-lesson-id"].progressPercentage).toBe(1.0);
  });

  test("migration correctly transforms legacy completedLessons into completed lessonSessions", () => {
    // Obtain the migrate function from the store options
    const persistOptions = (progressStore as any).persist?.getOptions();
    expect(persistOptions).toBeDefined();
    expect(persistOptions.migrate).toBeDefined();

    const mockPersistedState = {
      completedLessons: ["legacy-lesson-1", "legacy-lesson-2"],
      lessonSessions: {
        "existing-lesson": {
          status: "in_progress",
          verseMastery: {},
          verseStepIndex: {},
          progressPercentage: 0.5,
        },
      },
    };

    const migrated = persistOptions.migrate(mockPersistedState, 0);

    expect(migrated.lessonSessions["legacy-lesson-1"]).toEqual({
      status: "completed",
      verseMastery: {},
      verseStepIndex: {},
      progressPercentage: 1.0,
    });
    expect(migrated.lessonSessions["legacy-lesson-2"]).toEqual({
      status: "completed",
      verseMastery: {},
      verseStepIndex: {},
      progressPercentage: 1.0,
    });
    expect(migrated.lessonSessions["existing-lesson"]).toEqual({
      status: "in_progress",
      verseMastery: {},
      verseStepIndex: {},
      progressPercentage: 0.5,
    });
  });

  test("completed status is preserved when saving a session on already-completed lessons", () => {
    const { saveLessonSession, completeLessonSession } = progressStore.getState();
    
    // 1. Mark lesson as completed
    completeLessonSession("unit-01");
    expect(progressStore.getState().lessonSessions["unit-01"].status).toBe("completed");

    // 2. Simulate subsequent save (e.g. from backgrounding or exiting review)
    const existing = progressStore.getState().lessonSessions["unit-01"];
    const status = existing?.status === "completed" ? "completed" : "in_progress";

    saveLessonSession("unit-01", {
      status,
      verseMastery: { "Verse 1": { level: 2, completedModes: [] } } as any,
      verseStepIndex: { "Verse 1": 2 },
      progressPercentage: 0.5,
    });

    // 3. Status must remain 'completed'
    expect(progressStore.getState().lessonSessions["unit-01"].status).toBe("completed");
  });
});
