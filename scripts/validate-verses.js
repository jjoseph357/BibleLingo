require('dotenv').config();
const fs = require('fs');
const path = require('path');

const LESSONS_DIR = path.join(__dirname, '..', 'src', 'data', 'lessons');
const API_URL = "https://api.lsm.org/recver/txo.php";
const MAX_VERSES = 50;

// Keys required for every verse object in our new lesson structure
const REQUIRED_KEYS = [
  "lessonId", 
  "bookPath", 
  "unitTitle", 
  "verseReference", 
  "difficulty", 
  "themeTags", 
  "decoyWords"
];

// List of single chapter books for normalization
const SINGLE_CHAPTER_BOOKS = [
  "Obadiah", "Philemon", "2 John", "3 John", "Jude", "Obad.", "Philem."
];

function normalizeReference(ref) {
  for (const book of SINGLE_CHAPTER_BOOKS) {
    if (ref.startsWith(`${book} 1:`)) {
      return ref.replace(`${book} 1:`, `${book} `);
    }
  }
  return ref;
}

async function validate() {
  const appId = process.env.EXPO_PUBLIC_LSM_API_APP_ID;
  const token = process.env.EXPO_PUBLIC_LSM_API_TOKEN;

  if (!appId || !token) {
    console.error("❌ Missing LSM API credentials. Please set EXPO_PUBLIC_LSM_API_APP_ID and EXPO_PUBLIC_LSM_API_TOKEN in .env");
    process.exit(1);
  }

  const files = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith(".json"));
  
  let allVerses = []; // To hold { ref, decoyWords, file, originalRef }
  let allRefsSet = new Set();
  
  let missingFieldsCount = 0;
  let invalidDifficultyCount = 0;
  let dupesCount = 0;

  console.log(`Scanning ${files.length} lesson files...\n`);

  for (const file of files) {
    const raw = fs.readFileSync(path.join(LESSONS_DIR, file), "utf8");
    let verses;
    try {
      verses = JSON.parse(raw);
    } catch (e) {
      console.error(`❌ Failed to parse ${file}`);
      process.exit(1);
    }

    for (const v of verses) {
      // 1. Check required fields
      for (const key of REQUIRED_KEYS) {
        if (!(key in v)) {
          console.error(`❌ Missing field "${key}" in ${v.verseReference || 'Unknown'} (File: ${file})`);
          missingFieldsCount++;
        }
      }

      // 2. Check difficulty
      if (v.difficulty && !["Easy", "Medium", "Hard"].includes(v.difficulty)) {
        console.error(`❌ Invalid difficulty "${v.difficulty}" in ${v.verseReference} (File: ${file})`);
        invalidDifficultyCount++;
      }

      // 3. Check duplicates
      if (v.verseReference) {
        if (allRefsSet.has(v.verseReference)) {
          console.error(`❌ Duplicate verseReference: ${v.verseReference} (File: ${file})`);
          dupesCount++;
        }
        allRefsSet.add(v.verseReference);
        
        allVerses.push({
          originalRef: v.verseReference,
          normalizedRef: normalizeReference(v.verseReference),
          decoyWords: v.decoyWords || [],
          file: file
        });
      }
    }
  }

  console.log(`\nFound ${allVerses.length} unique verses. Proceeding to API validation...`);

  // Batch into chunks of MAX_VERSES
  const batches = [];
  for (let i = 0; i < allVerses.length; i += MAX_VERSES) {
    batches.push(allVerses.slice(i, i + MAX_VERSES));
  }

  let apiErrors = 0;
  let overlappingDecoys = 0;

  const credentials = btoa(`${appId}:${token}`);

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(`Fetching batch ${b + 1}/${batches.length}...`);
    
    const queryString = batch.map(v => v.normalizedRef).join(";");
    const url = `${API_URL}?String=${encodeURIComponent(queryString)}&Out=json`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` }
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error ${response.status} fetching batch ${b + 1}`);
        apiErrors++;
        continue;
      }

      const data = await response.json();

      if (data.message) {
        // This is where API-level errors (like "Invalid reference: Jude 1:19") show up
        console.error(`❌ API Error for batch ${b + 1}: ${data.message}`);
        apiErrors++;
        continue;
      }

      // Create a map of returned verses for O(1) lookup
      const fetchedTextMap = {};
      for (const apiVerse of data.verses) {
        fetchedTextMap[apiVerse.ref] = apiVerse.text;
      }

      // Validate each verse in the batch
      for (const v of batch) {
        // The API returns the normalized reference (e.g. "Jude 19" instead of "Jude 1:19")
        // We look up using our normalized string, but also fallback to the exact API string if needed
        let fetchedText = fetchedTextMap[v.normalizedRef];
        
        if (!fetchedText) {
          // Sometimes the API slightly alters the reference string (e.g., expanding abbreviations)
          // Let's do a loose matching just in case
          const possibleMatchKey = Object.keys(fetchedTextMap).find(key => key.includes(v.normalizedRef) || v.normalizedRef.includes(key));
          if (possibleMatchKey) {
            fetchedText = fetchedTextMap[possibleMatchKey];
          }
        }

        if (!fetchedText) {
          console.error(`❌ Verse text not returned by API for: ${v.originalRef} (Normalized: ${v.normalizedRef})`);
          apiErrors++;
          continue;
        }

        const lowerText = fetchedText.toLowerCase();
        for (const decoy of v.decoyWords) {
          if (lowerText.includes(decoy.toLowerCase())) {
            console.error(`❌ Decoy "${decoy}" accidentally found in real text of ${v.originalRef}`);
            overlappingDecoys++;
          }
        }
      }

    } catch (err) {
      console.error(`❌ Request failed for batch ${b + 1}:`, err.message);
      apiErrors++;
    }
  }

  console.log(`\n══ Validation Summary ══`);
  console.log(`Total Verses Checked: ${allVerses.length}`);
  console.log(`Missing Fields: ${missingFieldsCount}`);
  console.log(`Invalid Difficulty: ${invalidDifficultyCount}`);
  console.log(`Duplicate Refs: ${dupesCount}`);
  console.log(`API/Reference Errors: ${apiErrors}`);
  console.log(`Overlapping Decoys: ${overlappingDecoys}`);

  const totalErrors = missingFieldsCount + invalidDifficultyCount + dupesCount + apiErrors + overlappingDecoys;
  if (totalErrors === 0) {
    console.log("\n✅ All checks passed successfully!");
    process.exit(0);
  } else {
    console.log(`\n❌ Validation failed with ${totalErrors} total errors.`);
    process.exit(1);
  }
}

validate();
