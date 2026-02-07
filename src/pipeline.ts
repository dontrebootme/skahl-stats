import { getDb } from "./lib/firebaseAdmin";
import { getToken, buildHeaders } from "./lib/getToken";
import { ingestScheduleAndTeams } from "./ingest";
import { ingestGameDetails } from "./ingest_game_details";
import { aggregateStats } from "./aggregate_stats";

const forceMode = process.argv.includes("--force");

async function main() {
    const startTime = Date.now();
    console.log("=".repeat(60));
    console.log(`SKAHL Stats Pipeline — ${new Date().toISOString()}`);
    if (forceMode) console.log("⚡ Force mode enabled — full sync");
    console.log("=".repeat(60));

    // 1. Shared infrastructure
    const db = getDb();
    const token = await getToken();
    const headers = buildHeaders(token);

    // 2. Ingest schedule & teams
    const { gamesWritten, schedule } = await ingestScheduleAndTeams(db, headers, {
        force: forceMode,
    });

    if (!schedule) {
        console.log("\nℹ️ No active schedule found (off-season). Nothing to do.");
        logSummary(startTime, { gamesWritten: 0, detailsProcessed: 0, aggregated: false });
        return;
    }

    // 3. Ingest game details
    const detailsProcessed = await ingestGameDetails(db, headers);

    // 4. Aggregate stats (only if new details were fetched, or force mode)
    let aggregated = false;
    if (detailsProcessed > 0 || forceMode) {
        await aggregateStats(db);
        aggregated = true;
    } else {
        console.log("\nℹ️ No new game details — skipping aggregation.");
    }

    logSummary(startTime, { gamesWritten, detailsProcessed, aggregated });
}

function logSummary(
    startTime: number,
    stats: { gamesWritten: number; detailsProcessed: number; aggregated: boolean },
) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(60));
    console.log("Pipeline Summary:");
    console.log(`  Games synced:      ${stats.gamesWritten}`);
    console.log(`  Details fetched:   ${stats.detailsProcessed}`);
    console.log(`  Stats aggregated:  ${stats.aggregated ? "yes" : "skipped"}`);
    console.log(`  Total time:        ${elapsed}s`);
    console.log("=".repeat(60));
}

await main();
