/**
 * Generates 3 plausible but incorrect verse references from a correct one.
 * Produces variations by tweaking the verse number, chapter number, or book prefix.
 * Guarantees the correct reference is never included in the decoy set.
 */
export function generateDecoyReferences(correctRef: string): string[] {
  // Parse "Book. chapter:verse" or "Book. chapter:verseA-verseB"
  const colonIdx = correctRef.lastIndexOf(":");
  if (colonIdx === -1) {
    // Unparseable — fall back to simple numeric suffix changes
    return [`${correctRef}a`, `${correctRef}b`, `${correctRef}c`];
  }

  const bookChapter = correctRef.slice(0, colonIdx); // e.g. "Rom. 8"
  const versePart = correctRef.slice(colonIdx + 1);   // e.g. "10" or "55-56"

  // Extract the space-separated chapter from the book
  const lastSpaceIdx = bookChapter.lastIndexOf(" ");
  const bookName = bookChapter.slice(0, lastSpaceIdx);   // e.g. "Rom."
  const chapter = parseInt(bookChapter.slice(lastSpaceIdx + 1), 10);

  // Extract the primary verse number (before any dash)
  const primaryVerse = parseInt(versePart, 10);

  const decoys = new Set<string>();

  // Strategy 1: Rank-based uniform offset generator.
  // We randomly select a target rank (0 to 3) representing how many decoys should be smaller than the correct verse.
  // This guarantees the correct verse is equally likely to be the min, max, or middle option, completely neutralizing
  // both min/max range-filtering exploits and statistical average/mean exploits.
  const maxNegativeCount = primaryVerse - 1;
  const maxRankAllowed = Math.min(3, maxNegativeCount);
  const targetRank = Math.floor(Math.random() * (maxRankAllowed + 1));

  const negativeCount = targetRank;
  const positiveCount = 3 - targetRank;
  const selectedOffsets: number[] = [];

  // Generate unique negative offsets
  if (negativeCount > 0) {
    const negPool = [1, 2, 3, 4, 5].filter(v => v <= maxNegativeCount);
    const shuffledNegs = negPool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < negativeCount; i++) {
      selectedOffsets.push(-shuffledNegs[i]);
    }
  }

  // Generate unique positive offsets
  if (positiveCount > 0) {
    const posPool = [1, 2, 3, 4, 5];
    const shuffledPos = posPool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < positiveCount; i++) {
      selectedOffsets.push(shuffledPos[i]);
    }
  }

  for (const offset of selectedOffsets) {
    const candidate = `${bookName} ${chapter}:${primaryVerse + offset}`;
    if (candidate !== correctRef) {
      decoys.add(candidate);
    }
  }

  // Strategy 2: Vary chapter number (if we still need more decoys due to low verse pools)
  if (decoys.size < 3) {
    const chapterOffsets = [-2, -1, 1, 2, 3];
    const validChapterOffsets = chapterOffsets.filter(offset => chapter + offset >= 1);
    const shuffledChapters = [...validChapterOffsets].sort(() => Math.random() - 0.5);
    for (const offset of shuffledChapters) {
      if (decoys.size >= 3) break;
      const candidate = `${bookName} ${chapter + offset}:${primaryVerse}`;
      if (candidate !== correctRef) {
        decoys.add(candidate);
      }
    }
  }

  return Array.from(decoys).slice(0, 3);
}
