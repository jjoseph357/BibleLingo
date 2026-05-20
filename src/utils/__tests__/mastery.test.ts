import { generateMasteryTrack } from "../mastery";

describe("generateMasteryTrack", () => {
  test("Short verse (< 15 words) generates exactly 5 steps and follows rules", () => {
    const shortText = "The grace of the Lord Jesus Christ be with you.";
    const track = generateMasteryTrack(shortText);

    expect(track).toHaveLength(5);

    // Rule 1: All MISSING_LINK occur in first half (indices 0 to 2 for a 5-step array)
    const missingLinkIndices = track
      .map((step, idx) => (step.mode === "MISSING_LINK" ? idx : -1))
      .filter((idx) => idx !== -1);
    
    expect(missingLinkIndices.every((idx) => idx < 2)).toBe(true);

    // Rule 2: SCRAMBLE steps only in second half (indices 2 to 4)
    const scrambleIndices = track
      .map((step, idx) => (step.mode === "SCRAMBLE" ? idx : -1))
      .filter((idx) => idx !== -1);
    
    expect(scrambleIndices.every((idx) => idx >= 2)).toBe(true);

    // Rule 3: SCRIBE is always the final step
    expect(track[4].mode).toBe("SCRIBE");

    // Rule 4: missingCount scales up / stays non-decreasing (for steps that have a missingCount > 0)
    expect(track[0].missingCount).toBe(1);
    expect(track[1].missingCount).toBe(2);
    expect(track[2].missingCount).toBe(2);
  });

  test("Medium verse (15 - 30 words) generates exactly 8 steps and follows rules", () => {
    const mediumText =
      "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.";
    const track = generateMasteryTrack(mediumText);

    expect(track).toHaveLength(8);

    // Rule 1: All MISSING_LINK occur in first half (indices 0 to 3 for an 8-step array)
    const missingLinkIndices = track
      .map((step, idx) => (step.mode === "MISSING_LINK" ? idx : -1))
      .filter((idx) => idx !== -1);
    
    expect(missingLinkIndices.every((idx) => idx < 4)).toBe(true);

    // Rule 2: SCRAMBLE steps only in second half (indices 4 to 7)
    const scrambleIndices = track
      .map((step, idx) => (step.mode === "SCRAMBLE" ? idx : -1))
      .filter((idx) => idx !== -1);
    
    expect(scrambleIndices.every((idx) => idx >= 4)).toBe(true);

    // Rule 3: SCRIBE is always the final step
    expect(track[7].mode).toBe("SCRIBE");

    // Rule 4: missingCount scales up / stays non-decreasing
    expect(track[0].missingCount).toBe(1);
    expect(track[1].missingCount).toBe(2);
    expect(track[2].missingCount).toBe(3);
    expect(track[3].missingCount).toBe(3);
    expect(track[5].missingCount).toBe(4);
  });

  test("Long verse (> 30 words) generates exactly 10 steps and follows rules", () => {
    const longText =
      "But you shall receive power when the Holy Spirit has come upon you; and you shall be witnesses to Me in Jerusalem, and in all Judea and Samaria, and to the end of the earth.";
    const track = generateMasteryTrack(longText);

    expect(track).toHaveLength(10);

    // Rule 1: All MISSING_LINK occur in first half (indices 0 to 4 for a 10-step array)
    const missingLinkIndices = track
      .map((step, idx) => (step.mode === "MISSING_LINK" ? idx : -1))
      .filter((idx) => idx !== -1);
    
    expect(missingLinkIndices.every((idx) => idx < 5)).toBe(true);

    // Rule 2: SCRAMBLE steps only in second half (indices 5 to 9)
    const scrambleIndices = track
      .map((step, idx) => (step.mode === "SCRAMBLE" ? idx : -1))
      .filter((idx) => idx !== -1);
    
    expect(scrambleIndices.every((idx) => idx >= 5)).toBe(true);

    // Rule 3: SCRIBE is always the final step
    expect(track[9].mode).toBe("SCRIBE");

    // Rule 4: missingCount scales up / stays non-decreasing
    expect(track[0].missingCount).toBe(1);
    expect(track[1].missingCount).toBe(2);
    expect(track[2].missingCount).toBe(3);
    expect(track[3].missingCount).toBe(4);
    expect(track[4].missingCount).toBe(4);
    expect(track[6].missingCount).toBe(5);
    expect(track[8].missingCount).toBe(6);
  });
});
