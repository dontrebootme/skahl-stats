import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import puppeteer from "puppeteer";
import axios from "axios";
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

const SNOKING_URL = "https://snokingahl.com";
const API_BASE = "https://metal-api.sportninja.net/v1";

async function main() {
    if (!db) {
        console.error("❌ No database connection. Exiting.");
        process.exit(1);
    }

    console.log("🚀 Starting Game Details Ingestion...");

    // --- STEP 1: Get Token ---
    console.log("Launching headless browser for token...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let token: string | null = null;
    try {
        await page.goto(SNOKING_URL, { waitUntil: 'networkidle2' });
        // Wait for token to be set by the widget
        for (let i = 0; i < 20; i++) {
            token = await page.evaluate(() => localStorage.getItem('session_token_iframe'));
            if (token) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!token) throw new Error("Token not found after 20s.");
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
        'Accept': 'application/json',
        'Origin': 'https://snokingahl.com',
        'Referer': 'https://snokingahl.com/'
    };

    // --- STEP 2: Identify Games needing details ---
    // Fetch games that started in the past and don't have details yet
    const now = new Date().toISOString();
    console.log(`Querying for games that started before ${now} and missing details...`);
    
    const gamesSnapshot = await db.collection(COLLECTIONS.GAMES)
        .where('starts_at', '<', now)
        .where('has_details', '!=', true)
        .limit(50) // Process in chunks to avoid hitting API rate limits or long execution
        .get();

    console.log(`Found ${gamesSnapshot.size} games to process.`);

    for (const gameDoc of gamesSnapshot.docs) {
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

            // 1. Periods
            if (data.periods) {
                const periodsCol = gameRef.collection('periods');
                for (const p of data.periods) {
                    batch.set(periodsCol.doc(p.id), p, { merge: true });
                }
            }

            // 2. Goals
            if (data.goals) {
                const goalsCol = gameRef.collection('goals');
                for (const g of data.goals) {
                    batch.set(goalsCol.doc(g.id), g, { merge: true });
                }
            }

            // 3. Offenses (Penalties)
            if (data.offenses) {
                const penaltiesCol = gameRef.collection('penalties');
                for (const o of data.offenses) {
                    batch.set(penaltiesCol.doc(o.id), o, { merge: true });
                }
            }

            // Update main doc
            batch.update(gameRef, {
                has_details: true,
                lastDetailUpdate: new Date(),
                // Also sync scores just in case they were updated
                home_team_score: data.home_team_score,
                visiting_team_score: data.visiting_team_score,
                game_status_id: data.game_status_id
            });

            await batch.commit();
            console.log(`   ✅ Saved details for game ${gameId}`);

            // Small delay to be nice to the API
            await new Promise(r => setTimeout(r, 500));

        } catch (error: any) {
            console.error(`   ❌ Error processing game ${gameId}:`, error.response?.status || error.message);
        }
    }

    console.log("🏁 Ingestion of game details complete.");
}

main();
