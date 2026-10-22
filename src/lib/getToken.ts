import puppeteer from "puppeteer";
import { CONFIG } from "../config";

/**
 * Launches a headless browser, navigates to snokingahl.com, and polls
 * localStorage for the SportNinja API session token.
 *
 * Returns the token string. Throws if the token cannot be acquired.
 */
export async function getToken(): Promise<string> {
    console.log("Launching headless browser for token...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
        const page = await browser.newPage();
        await page.goto(CONFIG.urls.snoking, { waitUntil: "networkidle2" });

        // Poll localStorage — the SportNinja widget writes the token async
        const token = await page.evaluate(async () => {
            for (let i = 0; i < 20; i++) {
                const t = localStorage.getItem("session_token_iframe");
                if (t) return t;
                await new Promise((r) => setTimeout(r, 1000));
            }
            return null;
        });

        if (!token) {
            throw new Error("Token not found in localStorage after 20s.");
        }

        console.log("✅ Token acquired.");
        return token;
    } finally {
        await browser.close();
    }
}

/** Build the standard API request headers from a token. */
export function buildHeaders(token: string) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        Origin: CONFIG.urls.snoking,
        Referer: `${CONFIG.urls.snoking}/`,
    } as const;
}
