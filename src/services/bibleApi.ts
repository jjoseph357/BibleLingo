// ============================================================
// Bible API Service — LSM Recovery Version
// ============================================================
//
// Fetches verse text on demand from the LSM API.
// Does NOT cache or persist text (per LSM Terms of Service).
//
// Credentials are read from Expo environment variables:
//   EXPO_PUBLIC_LSM_API_APP_ID
//   EXPO_PUBLIC_LSM_API_TOKEN
//
// Usage:
//   const { verses, copyright } = await fetchLessonVerses(["John 1:14", "Rom 8:6"]);
// ============================================================

const API_URL = "https://api.lsm.org/recver/txo.php";
const MAX_VERSES = 50;

// ── Config (from Expo environment variables) ─────────────────

export interface BibleApiConfig {
  appId: string;
  token: string;
}

function loadConfig(): BibleApiConfig {
  const appId = process.env.EXPO_PUBLIC_LSM_API_APP_ID;
  const token = process.env.EXPO_PUBLIC_LSM_API_TOKEN;

  if (!appId || !token) {
    throw new Error(
      "Missing LSM API credentials. Add EXPO_PUBLIC_LSM_API_APP_ID and " +
        "EXPO_PUBLIC_LSM_API_TOKEN to your .env file, then restart Expo with -c."
    );
  }

  return { appId, token };
}

// ── API Response Types ───────────────────────────────────────

export interface ApiVerse {
  ref: string;
  text: string;
  urlpfx: string;
}

export interface ApiResponse {
  inputstring: string;
  detected: string;
  verses: ApiVerse[];
  message: string;
  copyright: string;
}

// ── Single-chapter book normalization ────────────────────────
// These books have only one chapter, so the API expects
// "Jude 9" not "Jude 1:9".

const SINGLE_CHAPTER_BOOKS = [
  "Obadiah",
  "Philemon",
  "2 John",
  "3 John",
  "Jude",
];

/** Strip "1:" from single-chapter book references. */
export function normalizeReference(ref: string): string {
  for (const book of SINGLE_CHAPTER_BOOKS) {
    if (ref.startsWith(`${book} 1:`)) {
      return ref.replace(`${book} 1:`, `${book} `);
    }
  }
  return ref;
}

// ── Fetch ────────────────────────────────────────────────────

/**
 * Fetch verse text from the LSM Recovery Version API.
 *
 * @param references - Array of verse references (e.g., ["John 1:14", "Rom 8:6"]).
 * @returns Object with `verses` (ref → text map for O(1) lookup) and `copyright` string.
 * @throws If API is not configured, too many verses requested, HTTP fails, or API returns an error message.
 */
export async function fetchLessonVerses(
  references: string[]
): Promise<{ verses: Record<string, string>; copyright: string }> {
  const config = loadConfig();

  if (references.length === 0) {
    return { verses: {}, copyright: "" };
  }

  if (references.length > MAX_VERSES) {
    throw new Error(
      `Cannot fetch more than ${MAX_VERSES} verses per request (got ${references.length}).`
    );
  }

  // Normalize single-chapter refs and join with semicolons.
  const queryString = references.map(normalizeReference).join(";");
  const credentials = btoa(`${config.appId}:${config.token}`);
  const url = `${API_URL}?String=${encodeURIComponent(queryString)}&Out=json`;

  const response = await fetch(url, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.ok) {
    throw new Error(
      `Bible API HTTP error: ${response.status} ${response.statusText}`
    );
  }

  const data: ApiResponse = await response.json();

  // The API puts error descriptions in the `message` field.
  if (data.message) {
    throw new Error(`Bible API error: ${data.message}`);
  }

  // Build O(1) lookup map: "John 1:14" → "And the Word..."
  const verses: Record<string, string> = {};
  for (const v of data.verses) {
    verses[v.ref] = v.text;
  }

  return { verses, copyright: data.copyright };
}
