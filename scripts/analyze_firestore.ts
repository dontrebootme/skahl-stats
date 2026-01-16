import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountEnv) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountEnv)) });
} else {
    console.log("ℹ️ No FIREBASE_SERVICE_ACCOUNT env var found. Using Application Default Credentials...");
    initializeApp({ projectId: "spof-io" });
}

const db = getFirestore();

async function analyze() {
    console.log("🔍 Analyzing 'games' collection in Firestore...");
    const gamesRef = db.collection('games');
    const snapshot = await gamesRef.get();

    console.log(`\n📊 Total Documents: ${snapshot.size}`);

    if (snapshot.empty) {
        console.log("Collection is empty.");
        return;
    }

    const scheduleCounts: Record<string, number> = {};
    const seasonCounts: Record<string, number> = {};
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    let nullDates = 0;

    snapshot.forEach(doc => {
        const data = doc.data();

        // Count by Schedule ID
        // Note: Field might be 'schedule_id' or 'schedule_uid' or missing
        const schedId = data.schedule_id || data.schedule_uid || 'UNKNOWN_SCHEDULE';
        scheduleCounts[schedId] = (scheduleCounts[schedId] || 0) + 1;

        // Count by Season ID (if available)
        const seasonId = data.season_id || 'UNKNOWN_SEASON';
        seasonCounts[seasonId] = (seasonCounts[seasonId] || 0) + 1;

        // Date Analysis
        const dateStr = data.starts_at || data.started_at;
        if (dateStr) {
            const d = new Date(dateStr);
            if (!minDate || d < minDate) minDate = d;
            if (!maxDate || d > maxDate) maxDate = d;
        } else {
            nullDates++;
        }
    });

    console.log("\n--- Breakdown by Schedule ID ---");
    console.table(scheduleCounts);

    console.log("\n--- Breakdown by Season ID ---");
    console.table(seasonCounts);

    console.log("\n--- Date Range ---");
    console.log(`Earliest Game: ${minDate?.toISOString()}`);
    console.log(`Latest Game:   ${maxDate?.toISOString()}`);
    console.log(`Games w/o Date: ${nullDates}`);
}

analyze();
