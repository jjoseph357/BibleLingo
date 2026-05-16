import {
  normalizeReference,
  fetchLessonVerses,
} from "../bibleApi";

// Set env vars for all tests in this file.
beforeAll(() => {
  process.env.EXPO_PUBLIC_LSM_API_APP_ID = "test-app-id";
  process.env.EXPO_PUBLIC_LSM_API_TOKEN = "test-token";
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_LSM_API_APP_ID;
  delete process.env.EXPO_PUBLIC_LSM_API_TOKEN;
});

// ── normalizeReference ───────────────────────────────────────

describe("normalizeReference", () => {
  test("strips chapter from single-chapter books", () => {
    expect(normalizeReference("Jude 1:9")).toBe("Jude 9");
    expect(normalizeReference("Philemon 1:6")).toBe("Philemon 6");
    expect(normalizeReference("2 John 1:3")).toBe("2 John 3");
    expect(normalizeReference("3 John 1:4")).toBe("3 John 4");
    expect(normalizeReference("Obadiah 1:4")).toBe("Obadiah 4");
  });

  test("leaves multi-chapter books unchanged", () => {
    expect(normalizeReference("John 1:14")).toBe("John 1:14");
    expect(normalizeReference("Romans 8:6")).toBe("Romans 8:6");
    expect(normalizeReference("1 Corinthians 6:17")).toBe("1 Corinthians 6:17");
  });

  test("leaves single-chapter books without chapter prefix unchanged", () => {
    expect(normalizeReference("Jude 9")).toBe("Jude 9");
  });
});

// ── fetchLessonVerses guards ─────────────────────────────────

describe("fetchLessonVerses", () => {
  test("throws if env vars are missing", async () => {
    const saved = process.env.EXPO_PUBLIC_LSM_API_APP_ID;
    delete process.env.EXPO_PUBLIC_LSM_API_APP_ID;

    await expect(fetchLessonVerses(["John 1:1"])).rejects.toThrow(
      "Missing LSM API credentials"
    );

    process.env.EXPO_PUBLIC_LSM_API_APP_ID = saved;
  });

  test("throws if more than 50 references are passed", async () => {
    const refs = Array.from({ length: 51 }, (_, i) => `Test ${i + 1}:1`);

    await expect(fetchLessonVerses(refs)).rejects.toThrow(
      "Cannot fetch more than 50 verses"
    );
  });

  test("returns empty map for empty input", async () => {
    const result = await fetchLessonVerses([]);
    expect(result.verses).toEqual({});
    expect(result.copyright).toBe("");
  });
});
