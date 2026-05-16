import { chunkVerseText, checkOrder, shuffle, WordItem } from "../scramble";

describe("chunkVerseText", () => {
  test("splits text into chunks of up to 3 words, respecting punctuation", () => {
    const result = chunkVerseText("In the beginning was the Word, and the Word was with God,");
    expect(result).toEqual([
      "In the beginning",
      "was the Word,",
      "and the Word",
      "was with God,"
    ]);
  });

  test("merges 1-word leftovers with the previous chunk", () => {
    const result = chunkVerseText("And the Word became flesh and tabernacled among us");
    expect(result).toEqual([
      "And the Word",
      "became flesh and",
      "tabernacled among us"
    ]);
  });

  test("handles empty or whitespace strings safely", () => {
    expect(chunkVerseText("")).toEqual([]);
    expect(chunkVerseText("   ")).toEqual([]);
  });
});

describe("checkOrder", () => {
  const TARGET = "In the beginning, God created";

  test("correct order matches", () => {
    const answer: WordItem[] = [
      { id: "0", text: "In the beginning," },
      { id: "1", text: "God created" }
    ];
    expect(checkOrder(answer, TARGET)).toBe(true);
  });

  test("wrong order fails", () => {
    const answer: WordItem[] = [
      { id: "0", text: "God created" },
      { id: "1", text: "In the beginning," }
    ];
    expect(checkOrder(answer, TARGET)).toBe(false);
  });

  test("extra decoy word in answer fails", () => {
    const answer: WordItem[] = [
      { id: "0", text: "In the beginning," },
      { id: "1", text: "God created" },
      { id: "d0", text: "mercy" },
    ];
    expect(checkOrder(answer, TARGET)).toBe(false);
  });

  test("missing word fails", () => {
    const answer: WordItem[] = [
      { id: "0", text: "In the beginning," }
    ];
    expect(checkOrder(answer, TARGET)).toBe(false);
  });
});

describe("shuffle", () => {
  test("returns array of same length with same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(5);
    expect(result.sort()).toEqual(input.sort());
  });

  test("does not mutate the original array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });
});
