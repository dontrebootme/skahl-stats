import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import puppeteer, { Browser, Page } from "puppeteer";
import axios from "axios";

// 1. Initialize Firebase
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

let db;

if (emulatorHost) {
    console.log(`⚠️ FIRESTORE_EMULATOR_HOST detected (${emulatorHost}). Connecting to Emulator...`);
    initializeApp({ projectId: "skahl-stats" });
    db = getFirestore();
} else if (serviceAccountEnv) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountEnv)) });
    db = getFirestore();
} else {
    // ADC Fallback for local development
    try {
        console.log("ℹ️ No env vars found. Attempting ADC connection...");
        initializeApp({ projectId: "spof-io" });
        db = getFirestore();
    } catch (e) {
        db = null;
    }
}

if (!db) console.log("⚠️ No FIREBASE_SERVICE_ACCOUNT or FIRESTORE_EMULATOR_HOST found. Firestore writes will be skipped.");

const SNOKING_URL = "https://snokingahl.com";
const SNOKING_TEAM_BASE = "https://snokingahl.com/schedule-stats/#/team";
const ORG_ID = "77NV8cZJ8xzsgvjL";
const API_BASE = "https://metal-api.sportninja.net/v1";

// Helper: (Removed)



async function main() {
    console.log(`[${new Date().toISOString()}] Starting Ingestion...`);

    // --- STEP 1: Get Token ---
    console.log("Launching headless browser...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let token: string | null = null;
    try {
        await page.goto(SNOKING_URL, { waitUntil: 'networkidle2' });
        token = await page.evaluate(async () => {
            for (let i = 0; i < 10; i++) {
                const t = localStorage.getItem('session_token_iframe');
                if (t) return t;
                await new Promise(r => setTimeout(r, 500));
            }
            return null;
        });
        if (!token) throw new Error("Token not found.");
        console.log("✅ Token acquired.");
    } catch (error) {
        console.error("❌ Failed to get token:", error);
        await browser.close();
        process.exit(1);
    }
    // KEEP BROWSER OPEN

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Origin': 'https://snokingahl.com',
        'Referer': 'https://snokingahl.com/'
    };

    try {
        // --- STEP 2: Fetch Active Schedule ---
        console.log("Fetching Org Schedules...");
        const schedulesRes = await axios.get(`${API_BASE}/organizations/${ORG_ID}/schedules`, { headers });
        const schedules = schedulesRes.data.data || [];

        // Find schedule where today is within starts_at and ends_at
        const now = new Date();
        const matchingSchedules = schedules.filter((s: any) => {
            const start = new Date(s.starts_at);
            const end = new Date(s.ends_at);
            return now >= start && now <= end;
        });

        if (matchingSchedules.length === 0) {
            console.error("❌ No active schedule found for current date:", now.toISOString());
            throw new Error("No currently running schedule found.");
        }

        // Use the first matching schedule, but warn if there are multiple (e.g. overlap with playoffs)
        const activeSchedule = matchingSchedules[0];
        if (matchingSchedules.length > 1) {
            console.warn(`⚠️ Multiple schedules match today's date: ${matchingSchedules.map((s: any) => s.name).join(", ")}`);
            console.warn(`➡️ Defaulting to: ${activeSchedule.name} (${activeSchedule.id})`);
        } else {
            console.log(`✅ Targeting Schedule: ${activeSchedule.name} (${activeSchedule.id})`);
        }

        // --- STEP 3: Fetch Games (With Pagination) ---
        const gamesUrl = `${API_BASE}/schedules/${activeSchedule.id}/games`;
        let allGames: any[] = [];
        let currentPage = 1;
        let totalPages = 1;

        console.log(`Fetching games from: ${gamesUrl}`);

        do {
            process.stdout.write(`   Fetching page ${currentPage}... `);
            const gamesRes = await axios.get(`${gamesUrl}?page=${currentPage}`, { headers });

            // Handle data structure
            const pageGames = Array.isArray(gamesRes.data) ? gamesRes.data : (gamesRes.data.data || []);
            allGames = allGames.concat(pageGames);

            console.log(`Found ${pageGames.length} games.`);

            if (gamesRes.data.meta?.pagination) {
                totalPages = gamesRes.data.meta.pagination.total_pages;
            }

            currentPage++;
        } while (currentPage <= totalPages);

        console.log(`✅ Fetched total of ${allGames.length} games.`);
        const games = allGames;

        // --- STEP 4: Submit Games & Extract Teams ---
        const teamsMap = new Map<string, any>(); // Extract team metadata from game objects

        // Fill teamsMap regardless of DB
        for (const game of games) {
            if (game.homeTeam?.id) teamsMap.set(game.homeTeam.id, game.homeTeam);
            if (game.visitingTeam?.id) teamsMap.set(game.visitingTeam.id, game.visitingTeam);
        }

        if (db) {
            let batch = db.batch();
            let count = 0;
            for (const game of games) {
                if (!game.id) continue;
                const docRef = db.collection('games').doc(game.id);

                // Save game object with injected Schedule/Season Metadata
                const gameData = {
                    ...game,
                    scheduleId: activeSchedule.id,
                    scheduleName: activeSchedule.name,
                    seasonId: activeSchedule.season_id || null, // Handle undefined
                    lastUpdated: new Date()
                };

                // Fallback for missing dates if possible (not much we can do if API is empty, but we verify)
                if (!gameData.starts_at && !gameData.started_at) {
                    // console.warn(`   -> Game ${game.id} has no start date.`);
                }

                batch.set(docRef, gameData, { merge: true });
                count++;
                if (count >= 400) {
                    await batch.commit();
                    batch = db.batch(); // Re-init batch
                    count = 0;
                }
            }
            if (count > 0) await batch.commit();
            console.log(`Saved ${games.length} games to Firestore.`);
        }

        // --- STEP 5: Fetch & Save Teams + Rosters ---
        console.log(`Found ${teamsMap.size} unique teams. Fetching Rosters...`);

        // Process teams
        const teams = Array.from(teamsMap.values());
        for (const team of teams) {
            console.log(`Processing Team: ${team.name} (${team.id})...`);

            // 5a. Save Team Metadata
            if (db) {
                await db.collection('teams').doc(team.id).set({ ...team, lastUpdated: new Date() }, { merge: true });
            }

            // 5b. Find Roster ID
            // Try Standard API First
            let rosterId: string | null = null;
            try {
                // Now works with proper headers!
                const rosterMetaRes = await axios.get(`${API_BASE}/teams/${team.id}/rosters`, { headers });
                const rosterMetas = Array.isArray(rosterMetaRes.data) ? rosterMetaRes.data : (rosterMetaRes.data.data || []);

                // Note: The object has "schedule_uid" matching our "activeSchedule.id"
                const targetRoster = rosterMetas.find((r: any) => r.schedule_uid === activeSchedule.id || r.schedule_id === activeSchedule.id);
                if (targetRoster) {
                    rosterId = targetRoster.id || targetRoster.uid;
                    console.log(`   -> Found Roster ID via API: ${rosterId}`);
                }
            } catch (e) { console.error(`   -> API Error finding roster: ${e}`); }

            // 5c. Fetch & Save Players
            if (rosterId) {
                try {
                    const playersRes = await axios.get(`${API_BASE}/teams/${team.id}/rosters/${rosterId}/players`, { headers });

                    // Unpack response: It is consistently { data: [ ... ] }
                    const responseBody = playersRes.data;

                    // Flexible unpacking
                    let players: any[] = [];
                    if (Array.isArray(responseBody)) players = responseBody;
                    else if (Array.isArray(responseBody.data)) players = responseBody.data;
                    else if (responseBody.data && Array.isArray(responseBody.data.players)) players = responseBody.data.players;
                    else if (responseBody.data && Array.isArray(responseBody.data.data)) players = responseBody.data.data;

                    if (players.length > 0) {
                        console.log(`   -> Found ${players.length} players.`);

                        if (db && players.length > 0) {
                            const rosterBatch = db.batch();
                            for (const player of players) {
                                const pRef = db.collection('teams').doc(team.id).collection('roster').doc(player.id);
                                rosterBatch.set(pRef, { ...player, rosterId: rosterId, lastUpdated: new Date() }, { merge: true });
                            }
                            await rosterBatch.commit();
                        }
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

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("❌ API Error:", error.response?.status, error.response?.statusText);
        } else {
            console.error("❌ Error:", error);
        }
        await browser.close();
        process.exit(1);
    } finally {
        await browser.close();
    }

    console.log("Ingestion complete.");
}

await main();
