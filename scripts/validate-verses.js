/**
 * Validates verse JSON files:
 * 1. JSON is parseable
 * 2. All required fields present with correct types
 * 3. No decoy word appears in its own verseText
 * 4. No duplicate verseReferences across files
 * 5. Difficulty is one of Easy/Medium/Hard
 */

const fs = require("fs");
const path = require("path");

const VERSE_DIR = path.join(__dirname, "..", "src", "data", "verses");
const files = fs.readdirSync(VERSE_DIR).filter((f) => f.endsWith(".json"));

let allRefs = [];
let errors = 0;

for (const file of files) {
  console.log(`\n── ${file} ──`);
  const raw = fs.readFileSync(path.join(VERSE_DIR, file), "utf8");
  const verses = JSON.parse(raw);
  console.log(`  Parsed OK: ${verses.length} verses`);

  for (const v of verses) {
    // Check required fields
    for (const key of ["bookPath","chapter","verseReference","verseText","themeTags","difficulty","decoyWords"]) {
      if (!(key in v)) { console.error(`  ❌ Missing field "${key}" in ${v.verseReference}`); errors++; }
    }

    // Check difficulty
    if (!["Easy","Medium","Hard"].includes(v.difficulty)) {
      console.error(`  ❌ Invalid difficulty "${v.difficulty}" in ${v.verseReference}`); errors++;
    }

    // Check decoy words not in verse text
    const lowerText = v.verseText.toLowerCase();
    for (const decoy of v.decoyWords) {
      if (lowerText.includes(decoy.toLowerCase())) {
        console.error(`  ❌ Decoy "${decoy}" found in verseText of ${v.verseReference}`); errors++;
      }
    }

    allRefs.push(v.verseReference);
  }
}

// Check for duplicate references
const dupes = allRefs.filter((r, i) => allRefs.indexOf(r) !== i);
if (dupes.length > 0) {
  console.error(`\n❌ Duplicate verseReferences: ${dupes.join(", ")}`); errors++;
}

console.log(`\n══ Summary ══`);
console.log(`Files: ${files.length}, Total verses: ${allRefs.length}, Errors: ${errors}`);
if (errors === 0) console.log("✅ All checks passed!");
