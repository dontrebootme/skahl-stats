import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import puppeteer from "puppeteer";
import axios from "axios";

// 1. Initialize Firebase
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
const db = serviceAccountEnv
    ? (initializeApp({ credential: cert(JSON.parse(serviceAccountEnv)) }), getFirestore())
    : null;

if (!db) console.log("⚠️ No FIREBASE_SERVICE_ACCOUNT found. Firestore writes will be skipped.");

const SNOKING_URL = "https://snokingahl.com";
const ORG_ID = "77NV8cZJ8xzsgvjL";
const API_BASE = "https://metal-api.sportninja.net/v1";

async function main() {
    console.log(`[${new Date().toISOString()}] Starting Ingestion...`);

    // --- STEP 1: Get Token ---
    console.log("Launching headless browser to extract token...");
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
    } finally {
        await browser.close();
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    };

    try {
        // --- STEP 2: Fetch Active Schedule ---
        console.log("Fetching Org Schedules...");
        const schedulesRes = await axios.get(`${API_BASE}/organizations/${ORG_ID}/schedules`, { headers });
        const schedules = schedulesRes.data.data || [];

        // Find schedule where today is within starts_at and ends_at
        const now = new Date();
        const activeSchedule = schedules.find((s: any) => {
            const start = new Date(s.starts_at);
            const end = new Date(s.ends_at);
            return now >= start && now <= end;
        });

        if (!activeSchedule) {
            console.log("⚠️ No active schedule found locally. Defaulting to first item or error.");
            throw new Error("No currently running schedule found.");
        }
        console.log(`Targeting Schedule: ${activeSchedule.name} (${activeSchedule.id})`);

        // --- STEP 3: Fetch Games ---
        const gamesUrl = `${API_BASE}/schedules/${activeSchedule.id}/games`;
        const gamesRes = await axios.get(gamesUrl, { headers });
        const games = Array.isArray(gamesRes.data) ? gamesRes.data : gamesRes.data.data || [];
        console.log(`✅ Fetched ${games.length} games.`);

        // --- STEP 4: Submit Games & Extract Teams ---
        const teamsMap = new Map<string, any>(); // Extract team metadata from game objects

        // Fill teamsMap regardless of DB
        for (const game of games) {
            if (game.homeTeam?.id) teamsMap.set(game.homeTeam.id, game.homeTeam);
            if (game.visitingTeam?.id) teamsMap.set(game.visitingTeam.id, game.visitingTeam);
        }

        if (db) {
            const batch = db.batch();
            let count = 0;
            for (const game of games) {
                if (!game.id) continue;
                const docRef = db.collection('games').doc(game.id);
                batch.set(docRef, { ...game, lastUpdated: new Date() }, { merge: true });
                count++;
                if (count >= 400) { await batch.commit(); count = 0; }
            }
            if (count > 0) await batch.commit();
            console.log(`Saved ${games.length} games to Firestore.`);
        }

        // --- STEP 5: Fetch & Save Teams + Rosters ---
        console.log(`Found ${teamsMap.size} unique teams. Fetching Rosters...`);

        // Process teams in chunks to avoid rate limits
        const teams = Array.from(teamsMap.values());
        for (const team of teams) {
            console.log(`Processing Team: ${team.name} (${team.id})...`);

            // 5a. Save Team Metadata
            if (db) {
                await db.collection('teams').doc(team.id).set({ ...team, lastUpdated: new Date() }, { merge: true });
            }

            // 5b. Find Roster ID for this Season
            // We look for a roster whose 'schedule_id' matches our activeSchedule.id
            try {
                const rosterMetaRes = await axios.get(`${API_BASE}/teams/${team.id}/rosters`, { headers });
                const rosterMetas = rosterMetaRes.data.data || [];

                // Find the roster generated for the current active schedule/season
                const targetRoster = rosterMetas.find((r: any) => r.schedule_id === activeSchedule.id);

                if (targetRoster) {
                    // 5c. Fetch Players
                    const playersRes = await axios.get(`${API_BASE}/teams/${team.id}/rosters/${targetRoster.id}/players`, { headers });
                    const players = playersRes.data.data || [];
                    console.log(`   -> Found ${players.length} players (Roster ID: ${targetRoster.id})`);

                    // 5d. Save Roster
                    if (db && players.length > 0) {
                        const rosterBatch = db.batch();
                        for (const player of players) {
                            const pRef = db.collection('teams').doc(team.id).collection('roster').doc(player.id);
                            rosterBatch.set(pRef, { ...player, rosterId: targetRoster.id, lastUpdated: new Date() }, { merge: true });
                        }
                        await rosterBatch.commit();
                    }
                } else {
                    console.log(`   -> No matching roster found for season ${activeSchedule.name}`);
                }

            } catch (e) {
                console.error(`   -> Failed to fetch roster for team ${team.id}:`, axios.isAxiosError(e) ? e.message : e);
            }
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("❌ API Error:", error.response?.status, error.response?.statusText);
        } else {
            console.error("❌ Error:", error);
        }
        process.exit(1);
    }

    console.log("Ingestion complete.");
}

await main();
