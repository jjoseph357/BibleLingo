import { generateDecoyReferences } from "../navigatorDecoys";

describe("generateDecoyReferences", () => {
  test("returns exactly 3 decoys", () => {
    expect(generateDecoyReferences("Rom. 8:10")).toHaveLength(3);
    expect(generateDecoyReferences("2 Cor. 13:14")).toHaveLength(3);
    expect(generateDecoyReferences("John 1:1")).toHaveLength(3);
  });

  test("never includes the correct reference", () => {
    const refs = [
      "Rom. 8:10",
      "2 Cor. 13:14",
      "John 3:16",
      "1 Tim. 1:4",
      "Lam. 3:55-56",
      "Eph. 1:10",
      "Col. 3:4",
    ];
    for (const ref of refs) {
      const decoys = generateDecoyReferences(ref);
      expect(decoys).not.toContain(ref);
    }
  });

  test("all 3 decoys are unique", () => {
    const decoys = generateDecoyReferences("Rom. 8:10");
    const unique = new Set(decoys);
    expect(unique.size).toBe(3);
  });

  test("decoys preserve the book name from the original reference", () => {
    const decoys = generateDecoyReferences("Rom. 8:10");
    for (const d of decoys) {
      expect(d).toMatch(/^Rom\./);
    }
  });

  test("handles verse 1 without generating verse 0 or negative", () => {
    const decoys = generateDecoyReferences("John 1:1");
    for (const d of decoys) {
      const verseNum = parseInt(d.split(":")[1], 10);
      expect(verseNum).toBeGreaterThanOrEqual(1);
    }
  });

  test("handles chapter 1 without generating chapter 0 or negative", () => {
    const decoys = generateDecoyReferences("John 1:1");
    for (const d of decoys) {
      const chapterPart = d.split(":")[0]; // e.g. "John 1"
      const chapter = parseInt(chapterPart.split(" ").pop()!, 10);
      expect(chapter).toBeGreaterThanOrEqual(1);
    }
  });
});
