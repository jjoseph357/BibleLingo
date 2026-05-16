// ============================================================
// Scramble Mode — Pure Utilities
// ============================================================

export interface WordItem {
  id: string;
  text: string;
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Split a verse into chunks of 2-4 words.
 * Respects punctuation (doesn't chunk across commas, periods, etc).
 */
export function chunkVerseText(text: string): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || words[0] === "") return [];

  const chunks: string[] = [];
  let currentChunk: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentChunk.push(word);

    const hasPunctuation = /[.,;:!?]/.test(word);
    const isLastWord = i === words.length - 1;

    // Break the chunk if it reaches 3 words, OR if it has punctuation, OR if it's the last word.
    if (hasPunctuation || currentChunk.length >= 3 || isLastWord) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
    }
  }

  // Pass 2: Merge any 1-word chunks with the previous chunk (if possible)
  // so we don't leave isolated words.
  const merged: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkWords = chunks[i].split(" ");
    if (chunkWords.length === 1 && merged.length > 0) {
      merged[merged.length - 1] += " " + chunks[i];
    } else {
      merged.push(chunks[i]);
    }
  }

  return merged;
}

/**
 * Build the initial word bank: target chunks + decoys, each with a unique id.
 */
export function buildWordBank(
  targetVerse: string,
  decoyWords: string[]
): WordItem[] {
  const targetTokens = chunkVerseText(targetVerse);
  const allWords: WordItem[] = targetTokens.map((text, i) => ({
    id: `t-${i}`,
    text,
  }));

  decoyWords.forEach((text, i) => {
    allWords.push({ id: `d-${i}`, text });
  });

  return shuffle(allWords);
}

/**
 * Check if the words placed in the answer box match the target verse chunks exactly.
 */
export function checkOrder(
  answerWords: WordItem[],
  targetVerse: string
): boolean {
  const targetTokens = chunkVerseText(targetVerse);
  const answer = answerWords.map((w) => w.text);

  if (answer.length !== targetTokens.length) return false;
  return answer.every((word, i) => word === targetTokens[i]);
}
