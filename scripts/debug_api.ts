import axios from "axios";
import puppeteer from "puppeteer";

const SNOKING_URL = "https://snokingahl.com";
const ORG_ID = "77NV8cZJ8xzsgvjL";
const API_BASE = "https://metal-api.sportninja.net/v1";

async function main() {
    console.log("Getting token...");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(SNOKING_URL, { waitUntil: 'networkidle2' });
    const token = await page.evaluate(async () => {
        for (let i = 0; i < 10; i++) {
            const t = localStorage.getItem('session_token_iframe');
            if (t) return t;
            await new Promise(r => setTimeout(r, 500));
        }
        return null;
    });
    await browser.close();

    if (!token) throw new Error("No token");

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Origin': 'https://snokingahl.com',
        'Referer': 'https://snokingahl.com/'
    };

    // --- STEP 2: Fetch Active Schedule ---
    console.log("Fetching Org Schedules...");
    const schedulesRes = await axios.get(`${API_BASE}/organizations/${ORG_ID}/schedules`, { headers });
    const schedules = schedulesRes.data.data || [];

    console.log(`Found ${schedules.length} schedules.`);

    let grandTotal = 0;

    for (const schedule of schedules) {
        console.log(`\n--- Analyzing Schedule: ${schedule.name} (${schedule.id}) ---`);

        const fs = await import('fs');
        if (schedule.season_id === undefined) {
            console.log("⚠️ Season ID is missing. Saving payload to schedule_payload_bad.json");
            fs.writeFileSync('schedule_payload_bad.json', JSON.stringify(schedule, null, 2));
        } else {
            console.log("✅ Season ID found! Saving payload to schedule_payload_good.json");
            fs.writeFileSync('schedule_payload_good.json', JSON.stringify(schedule, null, 2));
        }

        // Explicitly check properties
        console.log(`    Starts: ${schedule.starts_at}`);
        console.log(`    Ends:   ${schedule.ends_at}`);
        console.log(`    SeasonID: ${schedule.season_id} (Type: ${typeof schedule.season_id})`);

        // Log all keys to be sure
        // console.log("    Keys:", Object.keys(schedule).join(", "));

        const gamesUrl = `${API_BASE}/schedules/${schedule.id}/games`;
        let scheduleGamesCount = 0;
        let currentPage = 1;
        let totalPages = 1;

        try {
            do {
                const gamesRes = await axios.get(`${gamesUrl}?page=${currentPage}`, { headers });
                const pageGames = Array.isArray(gamesRes.data) ? gamesRes.data : (gamesRes.data.data || []);
                scheduleGamesCount += pageGames.length;

                if (gamesRes.data.meta?.pagination) {
                    totalPages = gamesRes.data.meta.pagination.total_pages;
                }
                currentPage++;
            } while (currentPage <= totalPages);

            console.log(`    Games: ${scheduleGamesCount}`);
            grandTotal += scheduleGamesCount;

        } catch (e: any) {
            console.log(`    ⚠️ Failed to fetch games: ${e.message}`);
        }
    }

    console.log(`\n✅ GRAND TOTAL GAMES IN API: ${grandTotal}`);
    await browser.close();
}

main();
