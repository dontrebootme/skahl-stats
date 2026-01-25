import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "./collections";

// 1. Initialize Firebase
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

let db: any;

if (emulatorHost) {
    initializeApp({ projectId: "skahl-stats" });
    db = getFirestore();
} else if (serviceAccountEnv) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountEnv)) });
    db = getFirestore();
} else {
    try {
        initializeApp({ projectId: "spof-io" });
        db = getFirestore();
    } catch (e) {
        db = null;
    }
}

interface PlayerStats {
    goals: number;
    assists: number;
    points: number;
    pim: number;
    gamesPlayed: number;
    teamId: string;
}

async function main() {
    if (!db) {
        console.error("❌ No database connection. Exiting.");
        process.exit(1);
    }

    console.log("📊 Starting Stats Aggregation...");

    const playerStatsMap = new Map<string, PlayerStats>();

    const getPlayer = (playerId: string, teamId: string) => {
        if (!playerStatsMap.has(playerId)) {
            playerStatsMap.set(playerId, {
                goals: 0,
                assists: 0,
                points: 0,
                pim: 0,
                gamesPlayed: 0,
                teamId
            });
        }
        return playerStatsMap.get(playerId)!;
    };

    // 1. Fetch all games with details
    console.log("Fetching games with details...");
    const gamesSnapshot = await db.collection(COLLECTIONS.GAMES)
        .where('has_details', '==', true)
        .get();

    console.log(`Processing ${gamesSnapshot.size} games...`);

    for (const gameDoc of gamesSnapshot.docs) {
        const gameId = gameDoc.id;
        
        // --- GOALS ---
        const goalsSnapshot = await gameDoc.ref.collection('goals').get();
        goalsSnapshot.forEach((doc: any) => {
            const goal = doc.data();
            const teamId = goal.shot?.team_id;
            const scorerId = goal.shot?.player_id;

            if (scorerId && teamId) {
                const stats = getPlayer(scorerId, teamId);
                stats.goals++;
                stats.points++;
            }

            if (goal.assists) {
                for (const assist of goal.assists) {
                    const helperId = assist.player?.id;
                    if (helperId && teamId) {
                        const stats = getPlayer(helperId, teamId);
                        stats.assists++;
                        stats.points++;
                    }
                }
            }
        });

        // --- PENALTIES ---
        const penaltiesSnapshot = await gameDoc.ref.collection('penalties').get();
        penaltiesSnapshot.forEach((doc: any) => {
            const penalty = doc.data();
            const playerId = penalty.player_id;
            const teamId = penalty.team_id;
            const minutes = penalty.penalty?.amount || 0;

            if (playerId && teamId) {
                const stats = getPlayer(playerId, teamId);
                stats.pim += minutes;
            }
        });

        // --- GP (Games Played) ---
        // Note: For now, we only know a player played if they were on the scoresheet.
        // To be accurate, we'd need the full game roster.
        // A placeholder for GP could be implemented later.
    }

    console.log(`Aggregated stats for ${playerStatsMap.size} players.`);

    // 2. Update Player Documents
    let updateCount = 0;
    for (const [playerId, stats] of playerStatsMap.entries()) {
        try {
            const playerRef = db.collection(COLLECTIONS.TEAMS).doc(stats.teamId).collection('roster').doc(playerId);
            
            // Check if player exists first to avoid creating orphaned stats
            const playerDoc = await playerRef.get();
            if (playerDoc.exists) {
                await playerRef.update({
                    stats: {
                        goals: stats.goals,
                        assists: stats.assists,
                        points: stats.points,
                        pim: stats.pim,
                        lastUpdated: new Date()
                    }
                });
                updateCount++;
            }
        } catch (e: any) {
            // console.error(`   ❌ Failed to update player ${playerId}: ${e.message}`);
        }
    }

    console.log(`✅ Updated ${updateCount} player documents.`);
    console.log("🏁 Stats aggregation complete.");
}

main();
