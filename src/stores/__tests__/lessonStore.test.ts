import { lessonStore } from "../lessonStore";
import { VerseItem } from "../../types/models";

/** Minimal verse stubs — only the shape matters, not the content. */
const VERSES: VerseItem[] = [
  {
    lessonId: "mock-01",
    bookPath: "The Economy of God",
    unitTitle: "The Divine Dispensing",
    verseReference: "2 Cor 13:14",
    verseText: "The grace of the Lord Jesus Christ...",
    themeTags: ["Triune God"],
    difficulty: "Easy",
    decoyWords: ["mercy"],
  },
  {
    lessonId: "mock-02",
    bookPath: "The Economy of God",
    unitTitle: "The Divine Dispensing",
    verseReference: "John 1:1",
    verseText: "In the beginning was the Word...",
    themeTags: ["Word"],
    difficulty: "Medium",
    decoyWords: ["end"],
  },
  {
    lessonId: "mock-03",
    bookPath: "The Economy of God",
    unitTitle: "The Divine Dispensing",
    verseReference: "Rom 8:2",
    verseText: "For the law of the Spirit of life...",
    themeTags: ["Spirit"],
    difficulty: "Hard",
    decoyWords: ["death"],
  },
];

beforeEach(() => {
  // Reset store to a clean lesson before every test.
  lessonStore.getState().startLesson(VERSES);
});

describe("lessonStore", () => {
  test("startLesson initializes state correctly", () => {
    const s = lessonStore.getState();
    expect(s.verses).toHaveLength(3);
    expect(s.currentQuestionIndex).toBe(0);
    expect(s.score).toBe(0);
    expect(s.lives).toBe(3);
    expect(s.isLessonComplete).toBe(false);
  });

  test("submitAnswer(true) increments score without affecting lives", () => {
    lessonStore.getState().submitAnswer(true);
    const s = lessonStore.getState();
    expect(s.score).toBe(1);
    expect(s.lives).toBe(3);
  });

  test("submitAnswer(false) decrements a life", () => {
    lessonStore.getState().submitAnswer(false);
    const s = lessonStore.getState();
    expect(s.lives).toBe(2);
    expect(s.score).toBe(0);
    expect(s.isLessonComplete).toBe(false);
  });

  test("reaching 0 lives sets isLessonComplete to true", () => {
    const { submitAnswer } = lessonStore.getState();
    submitAnswer(false); // lives → 2
    submitAnswer(false); // lives → 1
    submitAnswer(false); // lives → 0

    const s = lessonStore.getState();
    expect(s.lives).toBe(0);
    expect(s.isLessonComplete).toBe(true);
  });

  test("completing all questions sets isLessonComplete to true", () => {
    const store = lessonStore.getState();
    // Answer and advance through all 3 verses.
    store.submitAnswer(true);
    store.nextQuestion();
    store.submitAnswer(true);
    store.nextQuestion();
    store.submitAnswer(true);
    store.nextQuestion(); // past the last verse

    const s = lessonStore.getState();
    expect(s.isLessonComplete).toBe(true);
    expect(s.score).toBe(3);
    expect(s.currentQuestionIndex).toBe(2); // stays on last valid index
  });

  test("actions are no-ops after lesson is complete", () => {
    // Drain all lives.
    const { submitAnswer } = lessonStore.getState();
    submitAnswer(false);
    submitAnswer(false);
    submitAnswer(false);

    // Further actions should not mutate state.
    lessonStore.getState().submitAnswer(true);
    lessonStore.getState().nextQuestion();

    const s = lessonStore.getState();
    expect(s.score).toBe(0);
    expect(s.currentQuestionIndex).toBe(0);
  });

  test("restartLesson resets score, lives, and index but keeps verses", () => {
    const { submitAnswer, nextQuestion, restartLesson } =
      lessonStore.getState();
    submitAnswer(true);
    nextQuestion();
    submitAnswer(false);

    restartLesson();

    const s = lessonStore.getState();
    expect(s.currentQuestionIndex).toBe(0);
    expect(s.score).toBe(0);
    expect(s.lives).toBe(3);
    expect(s.isLessonComplete).toBe(false);
    expect(s.verses).toHaveLength(3); // verses preserved
  });
});
