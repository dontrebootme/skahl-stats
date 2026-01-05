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

    // --- STEP 2: Fetch Schedules (Seasons) ---
    console.log("Fetching Org Schedules...");
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    };

    try {
        // Note: The API wraps the array in a "data" property
        const schedulesRes = await axios.get(`${API_BASE}/organizations/${ORG_ID}/schedules`, { headers });
        const schedules = schedulesRes.data.data; // <--- Critical fix

        if (!Array.isArray(schedules) || schedules.length === 0) {
            throw new Error("No schedules found for organization.");
        }

        console.log(`✅ Found ${schedules.length} schedules.`);

        // Pick the most relevant schedule (e.g., active or first one)
        // You might want to filter by date or "is_active" flag if available
        const activeSchedule = schedules[0];
        console.log(`Targeting Schedule: ${activeSchedule.name} (${activeSchedule.id})`);

        // --- STEP 3: Fetch Games for Schedule ---
        const gamesUrl = `${API_BASE}/schedules/${activeSchedule.id}/games`;
        const gamesRes = await axios.get(gamesUrl, { headers });

        // Check if games are wrapped in 'data' too (SportNinja pattern seems to be consistently 'data')
        const games = Array.isArray(gamesRes.data) ? gamesRes.data : gamesRes.data.data;
        console.log(`✅ Fetched ${games?.length || 0} games for schedule.`);

        // --- STEP 4: Write to Firestore ---
        if (db && Array.isArray(games)) {
            const batch = db.batch();
            let count = 0;

            for (const game of games) {
                if (!game.id) continue;
                const docRef = db.collection('games').doc(game.id);
                batch.set(docRef, { ...game, lastUpdated: new Date() }, { merge: true });
                count++;
                if (count >= 400) { await batch.commit(); count = 0; }
            }
            if (count > 0) { await batch.commit(); }
            console.log(`Saved ${games.length} games to Firestore.`);
        } else {
            console.log("Skipping DB write.");
            if (games && games.length > 0) {
                console.log("Sample Game:", JSON.stringify(games[0], null, 2));
            }
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("❌ API Error:", error.response?.status, error.response?.statusText);
            console.error("Response data:", JSON.stringify(error.response?.data).slice(0, 200));
        } else {
            console.error("❌ Error:", error);
        }
        process.exit(1); // Ensure CI fails
    }

    console.log("Ingestion complete.");
}

await main();
