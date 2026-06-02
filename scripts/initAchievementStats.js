const admin = require('firebase-admin');

// IMPORTANT: Before running this script, you must download a Service Account Key from the Firebase Console.
// 1. Go to Firebase Console -> Project Settings -> Service Accounts
// 2. Click "Generate new private key"
// 3. Save the JSON file in your project root as "serviceAccountKey.json"
// 4. Make sure to ADD IT TO .gitignore SO IT IS NOT COMMITTED!
// 5. Run: npm install -D firebase-admin
// 6. Run: node scripts/initAchievementStats.js

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runBackfill() {
  console.log("Starting backfill for Achievement Stats...");
  
  const usersSnapshot = await db.collection('users').get();
  const totalUsers = usersSnapshot.size;
  console.log(`Found ${totalUsers} users.`);

  const counts = {};
  let processed = 0;

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const progressRef = db.collection('users').doc(uid).collection('data').doc('progress');
    const progressDoc = await progressRef.get();
    
    if (progressDoc.exists) {
      const data = progressDoc.data();
      const achievements = data.achievements || [];
      
      for (const ach of achievements) {
        if (!counts[ach]) counts[ach] = 0;
        counts[ach]++;
      }
    }
    
    processed++;
    if (processed % 5 === 0) {
      console.log(`Processed ${processed}/${totalUsers} users...`);
    }
  }

  console.log("Finished aggregating. Writing to /stats/achievements...");
  
  const statsRef = db.collection('stats').doc('achievements');
  await statsRef.set({
    totalUsers: totalUsers,
    counts: counts
  }, { merge: true });

  console.log("✅ Backfill Complete!");
  console.log("Stats written:", { totalUsers, counts });
}

runBackfill().then(() => process.exit(0)).catch(err => {
  console.error("Error running backfill:", err);
  process.exit(1);
});
