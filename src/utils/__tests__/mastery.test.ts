import { generateMasteryTrack } from "../mastery";

describe("generateMasteryTrack", () => {
  test("Short verse (< 15 words) generates exactly 7 steps and follows rules", () => {
    const shortText = "The grace of the Lord Jesus Christ be with you.";
    const track = generateMasteryTrack(shortText);

    expect(track).toHaveLength(7);

    // Rule: NAVIGATOR_EASY is the very first step
    expect(track[0].mode).toBe("NAVIGATOR_EASY");

    // Rule: All MISSING_LINK occur in the first half
    const missingLinkIndices = track
      .map((step, idx) => (step.mode === "MISSING_LINK" ? idx : -1))
      .filter((idx) => idx !== -1);

    expect(missingLinkIndices.every((idx) => idx < 3)).toBe(true);

    // Rule: NAVIGATOR_HARD at the transition between MISSING_LINK and TYPE_BLANK
    expect(track[3].mode).toBe("NAVIGATOR_HARD");

    // Rule: SCRAMBLE steps only in second half
    const scrambleIndices = track
      .map((step, idx) => (step.mode === "SCRAMBLE" ? idx : -1))
      .filter((idx) => idx !== -1);

    expect(scrambleIndices.every((idx) => idx >= 4)).toBe(true);

    // Rule: SCRIBE is always the final step
    expect(track[6].mode).toBe("SCRIBE");

    // Rule: missingCount scales up for fill-in steps
    expect(track[1].missingCount).toBe(2);
    expect(track[2].missingCount).toBe(3);
    expect(track[4].missingCount).toBe(4);
  });

  test("Medium verse (15 - 30 words) generates exactly 11 steps and follows rules", () => {
    const mediumText =
      "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.";
    const track = generateMasteryTrack(mediumText);

    expect(track).toHaveLength(11);

    // Rule: NAVIGATOR_EASY is first
    expect(track[0].mode).toBe("NAVIGATOR_EASY");

    // Rule: All MISSING_LINK occur in the first half
    const missingLinkIndices = track
      .map((step, idx) => (step.mode === "MISSING_LINK" ? idx : -1))
      .filter((idx) => idx !== -1);

    expect(missingLinkIndices.every((idx) => idx < 5)).toBe(true);

    // Rule: NAVIGATOR_HARD at the transition
    expect(track[4].mode).toBe("NAVIGATOR_HARD");

    // Rule: SCRAMBLE steps only in second half
    const scrambleIndices = track
      .map((step, idx) => (step.mode === "SCRAMBLE" ? idx : -1))
      .filter((idx) => idx !== -1);

    expect(scrambleIndices.every((idx) => idx >= 5)).toBe(true);

    // Rule: SCRIBE is always the final step
    expect(track[10].mode).toBe("SCRIBE");

    // Check second NAVIGATOR_HARD
    expect(track[9].mode).toBe("NAVIGATOR_HARD");

    // Rule: missingCount scales up
    expect(track[1].missingCount).toBe(3);
    expect(track[2].missingCount).toBe(4);
    expect(track[3].missingCount).toBe(5);
    expect(track[5].missingCount).toBe(6);
    expect(track[7].missingCount).toBe(8);
  });

  test("Long verse (> 30 words) generates exactly 13 steps and follows rules", () => {
    const longText =
      "But you shall receive power when the Holy Spirit has come upon you; and you shall be witnesses to Me in Jerusalem, and in all Judea and Samaria, and to the end of the earth.";
    const track = generateMasteryTrack(longText);

    expect(track).toHaveLength(13);

    // Rule: NAVIGATOR_EASY is first
    expect(track[0].mode).toBe("NAVIGATOR_EASY");

    // Rule: All MISSING_LINK occur in the first half
    const missingLinkIndices = track
      .map((step, idx) => (step.mode === "MISSING_LINK" ? idx : -1))
      .filter((idx) => idx !== -1);

    expect(missingLinkIndices.every((idx) => idx < 6)).toBe(true);

    // Rule: NAVIGATOR_HARD at the transition
    expect(track[5].mode).toBe("NAVIGATOR_HARD");

    // Rule: SCRAMBLE steps only in second half
    const scrambleIndices = track
      .map((step, idx) => (step.mode === "SCRAMBLE" ? idx : -1))
      .filter((idx) => idx !== -1);

    expect(scrambleIndices.every((idx) => idx >= 6)).toBe(true);

    // Rule: SCRIBE is always the final step
    expect(track[12].mode).toBe("SCRIBE");

    // Check second NAVIGATOR_HARD
    expect(track[11].mode).toBe("NAVIGATOR_HARD");

    // Rule: missingCount scales up
    expect(track[1].missingCount).toBe(4);
    expect(track[2].missingCount).toBe(6);
    expect(track[3].missingCount).toBe(8);
    expect(track[4].missingCount).toBe(10);
    expect(track[6].missingCount).toBe(8);
    expect(track[8].missingCount).toBe(10);
    expect(track[10].missingCount).toBe(12);
  });
});
