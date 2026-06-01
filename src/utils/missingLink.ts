import { chunkVerseText, shuffle, WordItem } from "./scramble";

export interface MissingLinkState {
  chunks: string[];
  blankIndices: number[];
  initialBank: WordItem[];
}

export function buildMissingLinkState(
  targetVerse: string,
  decoyWords: string[],
  blankCount?: number
): MissingLinkState {
  const chunks = chunkVerseText(targetVerse);
  
  // Determine how many blanks to have
  const maxBlanks = Math.min(5, Math.max(1, chunks.length - 1));
  const numBlanks = blankCount
    ? Math.min(blankCount, maxBlanks)
    : Math.min(3, Math.floor(Math.random() * maxBlanks) + 1);

  // Select random indices to be blanks
  const indices = Array.from({ length: chunks.length }, (_, i) => i);
  const shuffledIndices = shuffle(indices);
  const blankIndices = shuffledIndices.slice(0, numBlanks).sort((a, b) => a - b);

  // Build the bank
  const bankWords: WordItem[] = [];
  blankIndices.forEach((index) => {
    bankWords.push({ id: `t-${index}`, text: chunks[index] });
  });

  if (decoyWords && Array.isArray(decoyWords)) {
    decoyWords.forEach((text, i) => {
      bankWords.push({ id: `d-${i}`, text });
    });
  }

  return {
    chunks,
    blankIndices,
    initialBank: shuffle(bankWords),
  };
}

export function checkMissingLinkAnswer(
  filledBlanks: (WordItem | null)[],
  blankIndices: number[],
  chunks: string[]
): boolean {
  if (filledBlanks.some((w) => w === null)) return false;
  
  for (let i = 0; i < filledBlanks.length; i++) {
    const word = filledBlanks[i];
    const targetIndex = blankIndices[i];
    // Strip punctuation for the check, just in case, or exact match because they tapped it.
    // Since they tap exact chips, exact match on text is safe.
    if (word?.text !== chunks[targetIndex]) {
      return false;
    }
  }
  
  return true;
}
