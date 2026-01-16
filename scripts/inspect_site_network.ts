import puppeteer from "puppeteer";
import fs from "fs";

async function main() {
    console.log("🚀 Launching browser to inspect network traffic...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Store captured requests
    const capturedCalls: any[] = [];

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        request.continue();
    });

    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes("metal-api.sportninja.net") || url.includes("sequences")) {
            try {
                // Try to get JSON response
                const json = await response.json();
                console.log(`📡 Captured API Response: ${url}`);
                capturedCalls.push({
                    url: url,
                    method: response.request().method(),
                    status: response.status(),
                    body: json
                });
            } catch (e) {
                // Ignore non-JSON (options, images, etc)
            }
        }
    });

    console.log("🌍 Navigating to https://snokingahl.com/schedule-stats/ ...");
    try {
        await page.goto("https://snokingahl.com/schedule-stats/", { waitUntil: 'networkidle2', timeout: 60000 });
        console.log("✅ Page loaded.");
    } catch (e) {
        console.log("⚠️ Navigation timeout or error, but continuing to save captured logs.");
    }

    // Give it a few more seconds for dynamic calls
    await new Promise(r => setTimeout(r, 5000));

    console.log(`💾 Saving ${capturedCalls.length} API calls to network_log.json`);
    fs.writeFileSync('network_log.json', JSON.stringify(capturedCalls, null, 2));

    await browser.close();
    console.log("✨ Done.");
}

main();
