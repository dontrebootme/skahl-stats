import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CONFIG } from "./config";
import { COLLECTIONS } from "./collections";

// --- Helper Functions ---
function getDb() {
    // 1. Initialize Firebase
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    const appOptions: any = { projectId: CONFIG.projectId };

    if (serviceAccountEnv) {
        try {
            appOptions.credential = cert(JSON.parse(serviceAccountEnv));
        } catch (e) {
            console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
        }
    }

    // Avoid double initialization
    try {
        initializeApp(appOptions);
    } catch {
        // App likely already initialized
    }
    return getFirestore();
}

async function purgeGames() {
    const db = getDb();
    console.log(`🔥 Purging ALL games from Firestore (${COLLECTIONS.GAMES})...`);

    const gamesRef = db.collection(COLLECTIONS.GAMES);
    const snapshot = await gamesRef.get();

    if (snapshot.empty) {
        console.log("No games to delete.");
        return;
    }

    console.log(`Found ${snapshot.size} games. Deleting in batches...`);

    let batch = db.batch();
    let count = 0;
    let totalDeleted = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= 400) {
            await batch.commit();
            console.log(`... deleted ${totalDeleted + count}`);
            totalDeleted += count;
            batch = db.batch(); // Reset batch
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
        totalDeleted += count;
    }
    console.log(`✅ Deleted ${totalDeleted} games.`);
}

async function analyzeGames() {
    const db = getDb();
    console.log(`🔍 Analyzing '${COLLECTIONS.GAMES}' collection in Firestore...`);
    const gamesRef = db.collection(COLLECTIONS.GAMES);
    const snapshot = await gamesRef.get();

    console.log(`\n📊 Total Documents: ${snapshot.size}`);

    if (snapshot.empty) {
        console.log("Collection is empty.");
        return;
    }

    const scheduleCounts: Record<string, number> = {};
    const scheduleSamples: Record<string, string> = {};
    const seasonCounts: Record<string, number> = {};
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    let nullDates = 0;

    snapshot.forEach(doc => {
        const data = doc.data();

        // Count by Schedule ID
        const schedId = data.schedule_id || data.scheduleId || data.schedule_uid || 'UNKNOWN_SCHEDULE';
        scheduleCounts[schedId] = (scheduleCounts[schedId] || 0) + 1;

        // Sample for Schedule ID
        if (!scheduleSamples[schedId]) {
            if (data.homeTeam && data.visitingTeam) {
                scheduleSamples[schedId] = `${data.homeTeam.name} vs ${data.visitingTeam.name} (${data.date || 'No Date'})`;
            } else {
                scheduleSamples[schedId] = `[MISSING TEAMS] Raw: ${JSON.stringify(data).substring(0, 100)}...`;
            }
        }

        // Count by Season ID (if available)
        const seasonId = data.season_id || data.seasonId || 'UNKNOWN_SEASON';
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

    console.log("\n--- Sample Game for Each Schedule ID ---");
    console.table(scheduleSamples);

    console.log("\n--- Date Range ---");
    console.log(`Earliest Game: ${minDate ? minDate.toISOString() : 'N/A'}`);
    console.log(`Latest Game:   ${maxDate ? maxDate.toISOString() : 'N/A'}`);
    console.log(`Games w/o Date: ${nullDates}`);

    // --- Analyze Teams ---
    console.log(`\n🔍 Analyzing '${COLLECTIONS.TEAMS}' collection...`);
    const teamsRef = db.collection(COLLECTIONS.TEAMS);
    const teamsSnapshot = await teamsRef.get();
    console.log(`📊 Total Teams: ${teamsSnapshot.size}`);

    const teamSeasonCounts: Record<string, number> = {};
    const teamSample: Record<string, string> = {};

    teamsSnapshot.forEach(doc => {
        const data = doc.data();
        const seasonId = data.seasonId || data.season_id || 'UNKNOWN_SEASON';
        teamSeasonCounts[seasonId] = (teamSeasonCounts[seasonId] || 0) + 1;

        if (!teamSample[seasonId]) {
            teamSample[seasonId] = `${data.name} (ID: ${doc.id})`;
        }
    });

    console.log("\n--- Teams by Season ID ---");
    console.table(teamSeasonCounts);
    console.log("\n--- Sample Team for Each Season ID ---");
    console.table(teamSample);
}

// --- CLI Entry Point ---
async function main() {
    const command = process.argv[2];

    switch (command) {
        case "purge":
            await purgeGames();
            break;
        case "analyze":
            await analyzeGames();
            break;
        default:
            console.log(`
Usage: bun run src/cli.ts <command>

Commands:
  purge       Delete all games from Firestore
  analyze     Analyze the stats of the games collection
            `);
            process.exit(1);
    }
}

await main();
