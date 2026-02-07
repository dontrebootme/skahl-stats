import { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "./collections";
import { sanitizeDocId } from "./lib/firebaseAdmin";

interface PlayerStats {
    goals: number;
    assists: number;
    points: number;
    pim: number;
    gamesPlayed: number;
    teamId: string;
}

/**
 * Recalculates player stats (goals, assists, points, PIM) from all games
 * that have details, and writes the aggregated stats to each player's
 * roster document.
 */
export async function aggregateStats(db: Firestore): Promise<void> {
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
                teamId,
            });
        }
        return playerStatsMap.get(playerId)!;
    };

    // Fetch all games with details
    console.log("Fetching games with details...");
    const gamesSnapshot = await db
        .collection(COLLECTIONS.GAMES)
        .where("has_details", "==", true)
        .get();

    console.log(`Processing ${gamesSnapshot.size} games...`);

    for (const gameDoc of gamesSnapshot.docs) {
        // --- GOALS ---
        const goalsSnapshot = await gameDoc.ref.collection("goals").get();
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
        const penaltiesSnapshot = await gameDoc.ref.collection("penalties").get();
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
    }

    console.log(`Aggregated stats for ${playerStatsMap.size} players.`);

    // Update Player Documents
    let updateCount = 0;
    for (const [playerId, stats] of playerStatsMap.entries()) {
        try {
            const playerRef = db
                .collection(COLLECTIONS.TEAMS)
                .doc(sanitizeDocId(stats.teamId))
                .collection("roster")
                .doc(sanitizeDocId(playerId));

            const playerDoc = await playerRef.get();
            if (playerDoc.exists) {
                await playerRef.update({
                    stats: {
                        goals: stats.goals,
                        assists: stats.assists,
                        points: stats.points,
                        pim: stats.pim,
                        lastUpdated: new Date(),
                    },
                });
                updateCount++;
            }
        } catch (e) {
            console.error(`   ❌ Failed to update player ${playerId}:`, e);
        }
    }

    console.log(`✅ Updated ${updateCount} player documents.`);
    console.log("🏁 Stats aggregation complete.");
}

// --- Standalone entry point ---
if (import.meta.main) {
    const { getDb } = await import("./lib/firebaseAdmin");
    await aggregateStats(getDb());
}
