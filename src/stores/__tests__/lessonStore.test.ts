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

  test("reaching 0 lives (or fewer) decrements lives but does not set isLessonComplete to true", () => {
    const { submitAnswer } = lessonStore.getState();
    submitAnswer(false); // lives → 2
    submitAnswer(false); // lives → 1
    submitAnswer(false); // lives → 0

    const s = lessonStore.getState();
    expect(s.lives).toBe(0);
    expect(s.isLessonComplete).toBe(false);

    submitAnswer(false); // lives → -1
    const s2 = lessonStore.getState();
    expect(s2.lives).toBe(-1);
    expect(s2.isLessonComplete).toBe(false);
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
    // Manually complete the lesson.
    lessonStore.setState({ isLessonComplete: true });

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

  test("resetLessonState clears all state variables, including verses", () => {
    const { submitAnswer, nextQuestion, resetLessonState } =
      lessonStore.getState();
    submitAnswer(true);
    nextQuestion();
    submitAnswer(false);

    resetLessonState();

    const s = lessonStore.getState();
    expect(s.currentQuestionIndex).toBe(0);
    expect(s.score).toBe(0);
    expect(s.lives).toBe(3);
    expect(s.isLessonComplete).toBe(false);
    expect(s.verses).toHaveLength(0); // verses fully cleared
    expect(s.isReviewMode).toBe(false);
    expect(s.copyrightText).toBe("");
    expect(s.lastPlayedVerseReference).toBeNull();
  });

  test("lastPlayedVerseReference records reference on submitAnswer and is cleared on restart/reset", () => {
    const { submitAnswer, restartLesson, resetLessonState } = lessonStore.getState();

    // 1. Initially null
    expect(lessonStore.getState().lastPlayedVerseReference).toBeNull();

    // 2. submitAnswer updates it
    submitAnswer(true, "Rom 8:2");
    expect(lessonStore.getState().lastPlayedVerseReference).toBe("Rom 8:2");

    submitAnswer(false, "John 1:1");
    expect(lessonStore.getState().lastPlayedVerseReference).toBe("John 1:1");

    // 3. restartLesson clears it
    restartLesson();
    expect(lessonStore.getState().lastPlayedVerseReference).toBeNull();

    // 4. Reset clears it
    submitAnswer(true, "Rom 8:2");
    resetLessonState();
    expect(lessonStore.getState().lastPlayedVerseReference).toBeNull();
  });
});
