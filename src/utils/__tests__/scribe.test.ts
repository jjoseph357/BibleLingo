import { checkScribeAnswer } from "../scribe";

const TARGET = "In the beginning, God created...";

describe("checkScribeAnswer", () => {
  test("matches when only case and punctuation differ", () => {
    expect(checkScribeAnswer("in the beginning god created", TARGET)).toBe(
      true
    );
  });

  test("fails on misspelling", () => {
    expect(checkScribeAnswer("in the begining god created", TARGET)).toBe(
      false
    );
  });

  test("fails on extra words", () => {
    expect(
      checkScribeAnswer("in the beginning god created the heavens", TARGET)
    ).toBe(false);
  });

  test("matches despite extra whitespace", () => {
    expect(
      checkScribeAnswer("  in  the   beginning   god   created  ", TARGET)
    ).toBe(true);
  });

  test("treats hyphens as word separators", () => {
    const target = "the life-giving Spirit";
    expect(checkScribeAnswer("the life giving spirit", target)).toBe(true);
    expect(checkScribeAnswer("the lifegiving spirit", target)).toBe(false);
  });
});
