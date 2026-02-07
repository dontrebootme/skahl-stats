import { Firestore } from "firebase-admin/firestore";
import axios from "axios";
import { COLLECTIONS } from "./collections";
import { CONFIG } from "./config";

const API_BASE = CONFIG.urls.apiBase;

/**
 * Fetches game details (periods, goals, penalties) for recent games that
 * don't have them yet. Scopes the query to the last 14 days to avoid
 * scanning the entire games collection.
 *
 * Returns the number of games that were processed.
 */
export async function ingestGameDetails(
    db: Firestore,
    headers: Record<string, string>,
): Promise<number> {
    console.log("🚀 Starting Game Details Ingestion...");

    // Scope to last 14 days to limit Firestore reads
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    console.log(`Querying for games between ${twoWeeksAgo.toISOString()} and ${now.toISOString()} missing details...`);

    const gamesSnapshot = await db
        .collection(COLLECTIONS.GAMES)
        .where("starts_at", ">", twoWeeksAgo.toISOString())
        .where("starts_at", "<", now.toISOString())
        .orderBy("starts_at", "desc")
        .get();

    // Filter in code for games that don't have details yet
    const gamesToProcess = gamesSnapshot.docs.filter(
        (doc: any) => !doc.data().has_details,
    );
    console.log(
        `Found ${gamesToProcess.length} games to process (out of ${gamesSnapshot.size} recent past games).`,
    );

    let processedCount = 0;

    for (const gameDoc of gamesToProcess) {
        const gameId = gameDoc.id;
        console.log(`Processing game ${gameId}...`);

        try {
            const res = await axios.get(`${API_BASE}/games/${gameId}`, { headers });
            const data = res.data.data;

            if (!data) {
                console.warn(`   ⚠️ No data returned for game ${gameId}`);
                continue;
            }

            const batch = db.batch();
            const gameRef = db.collection(COLLECTIONS.GAMES).doc(gameId);

            // Periods
            if (data.periods) {
                const periodsCol = gameRef.collection("periods");
                for (const p of data.periods) {
                    batch.set(periodsCol.doc(p.id), p, { merge: true });
                }
            }

            // Goals
            if (data.goals) {
                const goalsCol = gameRef.collection("goals");
                for (const g of data.goals) {
                    batch.set(goalsCol.doc(g.id), g, { merge: true });
                }
            }

            // Offenses (Penalties)
            if (data.offenses) {
                const penaltiesCol = gameRef.collection("penalties");
                for (const o of data.offenses) {
                    batch.set(penaltiesCol.doc(o.id), o, { merge: true });
                }
            }

            // Update main doc
            batch.update(gameRef, {
                has_details: true,
                lastDetailUpdate: new Date(),
                home_team_score: data.home_team_score,
                visiting_team_score: data.visiting_team_score,
                game_status_id: data.game_status_id,
            });

            await batch.commit();
            processedCount++;
            console.log(`   ✅ Saved details for game ${gameId}`);

            // Small delay to be nice to the API
            await new Promise((r) => setTimeout(r, 500));
        } catch (error: any) {
            console.error(
                `   ❌ Error processing game ${gameId}:`,
                error.response?.status || error.message,
            );
        }
    }

    console.log(`🏁 Game details ingestion complete. Processed ${processedCount} games.`);
    return processedCount;
}

// --- Standalone entry point ---
if (import.meta.main) {
    const { getDb } = await import("./lib/firebaseAdmin");
    const { getToken, buildHeaders } = await import("./lib/getToken");

    const db = getDb();
    if (!db) {
        console.error("❌ No database connection. Exiting.");
        process.exit(1);
    }

    const token = await getToken();
    const headers = buildHeaders(token);

    try {
        const count = await ingestGameDetails(db, headers);
        console.log(`Done. ${count} games processed.`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("❌ API Error:", error.response?.status, error.response?.statusText);
        } else {
            console.error("❌ Error:", error);
        }
        process.exit(1);
    }
}
