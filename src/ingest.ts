import { Firestore } from "firebase-admin/firestore";
import axios from "axios";
import { COLLECTIONS } from "./collections";
import { CONFIG } from "./config";

const API_BASE = CONFIG.urls.apiBase;
const ORG_ID = CONFIG.orgId;

export interface IngestResult {
    gamesWritten: number;
    schedule: { id: string; name: string; season_id?: string } | null;
}

export interface IngestOptions {
    force?: boolean;
}

/**
 * Fetches the active schedule, syncs all games to Firestore, and refreshes
 * team rosters (skipping rosters synced within 24h unless force is set).
 */
export async function ingestScheduleAndTeams(
    db: Firestore,
    headers: Record<string, string>,
    options: IngestOptions = {},
): Promise<IngestResult> {
    console.log(`[${new Date().toISOString()}] Starting schedule & teams ingestion...`);

    // --- Fetch Active Schedule ---
    console.log("Fetching Org Schedules...");
    const schedulesRes = await axios.get(
        `${API_BASE}/organizations/${ORG_ID}/schedules`,
        { headers },
    );
    const schedules = schedulesRes.data.data || [];

    const now = new Date();
    const matchingSchedules = schedules.filter((s: any) => {
        const start = new Date(s.starts_at);
        const end = new Date(s.ends_at);
        return now >= start && now <= end;
    });

    if (matchingSchedules.length === 0) {
        console.log("ℹ️ No active schedule found for current date:", now.toISOString());
        return { gamesWritten: 0, schedule: null };
    }

    const activeSchedule = matchingSchedules[0];
    if (matchingSchedules.length > 1) {
        console.warn(
            `⚠️ Multiple schedules match today's date: ${matchingSchedules.map((s: any) => s.name).join(", ")}`,
        );
        console.warn(`➡️ Defaulting to: ${activeSchedule.name} (${activeSchedule.id})`);
    } else {
        console.log(`✅ Targeting Schedule: ${activeSchedule.name} (${activeSchedule.id})`);
    }

    // --- Fetch Games (With Pagination) ---
    const gamesUrl = `${API_BASE}/schedules/${activeSchedule.id}/games`;
    let allGames: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    console.log(`Fetching games from: ${gamesUrl}`);

    do {
        process.stdout.write(`   Fetching page ${currentPage}... `);
        const gamesRes = await axios.get(`${gamesUrl}?page=${currentPage}`, { headers });

        const pageGames = Array.isArray(gamesRes.data)
            ? gamesRes.data
            : (gamesRes.data.data || []);
        allGames = allGames.concat(pageGames);

        console.log(`Found ${pageGames.length} games.`);

        if (gamesRes.data.meta?.pagination) {
            totalPages = gamesRes.data.meta.pagination.total_pages;
        }

        currentPage++;
    } while (currentPage <= totalPages);

    console.log(`✅ Fetched total of ${allGames.length} games.`);

    // --- Submit Games & Extract Teams ---
    const teamsMap = new Map<string, any>();

    for (const game of allGames) {
        if (game.homeTeam?.id) teamsMap.set(game.homeTeam.id, game.homeTeam);
        if (game.visitingTeam?.id) teamsMap.set(game.visitingTeam.id, game.visitingTeam);
    }

    let batch = db.batch();
    let count = 0;
    for (const game of allGames) {
        if (!game.id) continue;
        const docRef = db.collection(COLLECTIONS.GAMES).doc(game.id);

        const gameData = {
            ...game,
            scheduleId: activeSchedule.id,
            scheduleName: activeSchedule.name,
            seasonId: activeSchedule.season_id || null,
            lastUpdated: new Date(),
        };

        // Prevent overwriting detailed scores with stale summary data
        delete gameData.home_team_score;
        delete gameData.visiting_team_score;
        if (gameData.homeTeam) delete gameData.homeTeam.score;
        if (gameData.visitingTeam) delete gameData.visitingTeam.score;

        batch.set(docRef, gameData, { merge: true });
        count++;
        if (count >= 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) await batch.commit();
    console.log(`Saved ${allGames.length} games to Firestore.`);

    // --- Fetch & Save Teams + Rosters ---
    console.log(`Found ${teamsMap.size} unique teams. Fetching Rosters...`);
    const teams = Array.from(teamsMap.values());
    const ROSTER_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

    for (const team of teams) {
        console.log(`Processing Team: ${team.name} (${team.id})...`);

        // Save Team Metadata
        await db
            .collection(COLLECTIONS.TEAMS)
            .doc(team.id)
            .set({ ...team, lastUpdated: new Date() }, { merge: true });

        // Check roster freshness (skip if synced < 24h ago, unless --force)
        if (!options.force) {
            const teamDoc = await db.collection(COLLECTIONS.TEAMS).doc(team.id).get();
            const lastRosterSync = teamDoc.data()?.lastRosterSync?.toDate?.();
            if (lastRosterSync && Date.now() - lastRosterSync.getTime() < ROSTER_TTL_MS) {
                console.log(`   -> Roster synced ${Math.round((Date.now() - lastRosterSync.getTime()) / 60000)}m ago. Skipping.`);
                continue;
            }
        }

        // Find Roster ID
        let rosterId: string | null = null;
        try {
            const rosterMetaRes = await axios.get(
                `${API_BASE}/teams/${team.id}/rosters`,
                { headers },
            );
            const rosterMetas = Array.isArray(rosterMetaRes.data)
                ? rosterMetaRes.data
                : (rosterMetaRes.data.data || []);

            const targetRoster = rosterMetas.find(
                (r: any) => r.schedule_uid === activeSchedule.id || r.schedule_id === activeSchedule.id,
            );
            if (targetRoster) {
                rosterId = targetRoster.id || targetRoster.uid;
                console.log(`   -> Found Roster ID via API: ${rosterId}`);
            }
        } catch (e) {
            console.error(`   -> API Error finding roster: ${e}`);
        }

        // Fetch & Save Players
        if (rosterId) {
            try {
                const playersRes = await axios.get(
                    `${API_BASE}/teams/${team.id}/rosters/${rosterId}/players`,
                    { headers },
                );

                const responseBody = playersRes.data;
                let players: any[] = [];
                if (Array.isArray(responseBody)) players = responseBody;
                else if (Array.isArray(responseBody.data)) players = responseBody.data;
                else if (responseBody.data && Array.isArray(responseBody.data.players))
                    players = responseBody.data.players;
                else if (responseBody.data && Array.isArray(responseBody.data.data))
                    players = responseBody.data.data;

                if (players.length > 0) {
                    console.log(`   -> Found ${players.length} players.`);

                    const rosterBatch = db.batch();
                    for (const player of players) {
                        const pRef = db
                            .collection(COLLECTIONS.TEAMS)
                            .doc(team.id)
                            .collection("roster")
                            .doc(player.id);
                        rosterBatch.set(
                            pRef,
                            { ...player, rosterId: rosterId, lastUpdated: new Date() },
                            { merge: true },
                        );
                    }
                    await rosterBatch.commit();

                    // Mark roster as synced
                    await db
                        .collection(COLLECTIONS.TEAMS)
                        .doc(team.id)
                        .update({ lastRosterSync: new Date() });
                } else {
                    console.warn(`   -> ⚠️ Could not find player array in response.`);
                }
            } catch (e: any) {
                console.error(`   -> Failed to fetch players for ${rosterId}: ${e.message}`);
            }
        } else {
            console.warn(`   -> ⚠️ Could not find Roster ID for team ${team.name}. Skipping players.`);
        }
    }

    console.log("Schedule & teams ingestion complete.");
    return { gamesWritten: allGames.length, schedule: activeSchedule };
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
    const force = process.argv.includes("--force");

    try {
        const result = await ingestScheduleAndTeams(db, headers, { force });
        if (!result.schedule) {
            console.log("No active schedule. Exiting.");
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("❌ API Error:", error.response?.status, error.response?.statusText);
        } else {
            console.error("❌ Error:", error);
        }
        process.exit(1);
    }
}
