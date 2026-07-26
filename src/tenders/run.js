require("dotenv").config();
const { scrapeAllListings } = require("./scrapePraz");
const { upsertTenders } = require("./tendersStore");

/**
 * Run this on a schedule (e.g. every 6-12 hours via a cron job, a
 * scheduled GitHub Action, or a simple `setInterval` in a long-running
 * process) — not continuously. See docs/ETHICS.md on respectful access;
 * PRAZ's bulletin board doesn't change fast enough to justify more
 * frequent polling, and gentler polling is kinder to their infrastructure.
 *
 * Usage: node src/tenders/run.js
 */
async function run() {
  const startedAt = Date.now();
  console.log("[tenders/run] Starting scrape...");

  try {
    const tenders = await scrapeAllListings();
    const { upserted } = await upsertTenders(tenders);
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`[tenders/run] Done in ${seconds}s — upserted ${upserted} tender(s).`);
  } catch (err) {
    console.error("[tenders/run] Scrape failed:", err.message);
    process.exitCode = 1;
  }
}

run();
