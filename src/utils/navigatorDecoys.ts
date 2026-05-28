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

  // Strategy 1: Vary verse number (±1 to ±4)
  const verseOffsets = [-2, -1, 1, 2, 3, 4];
  for (const offset of verseOffsets) {
    if (decoys.size >= 3) break;
    const newVerse = primaryVerse + offset;
    if (newVerse >= 1) {
      const candidate = `${bookName} ${chapter}:${newVerse}`;
      if (candidate !== correctRef) decoys.add(candidate);
    }
  }

  // Strategy 2: Vary chapter number (if still need more)
  if (decoys.size < 3) {
    const chapterOffsets = [-1, 1, 2];
    for (const offset of chapterOffsets) {
      if (decoys.size >= 3) break;
      const newChapter = chapter + offset;
      if (newChapter >= 1) {
        const candidate = `${bookName} ${newChapter}:${primaryVerse}`;
        if (candidate !== correctRef) decoys.add(candidate);
      }
    }
  }

  return Array.from(decoys).slice(0, 3);
}
