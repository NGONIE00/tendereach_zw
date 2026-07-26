const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes PRAZ's public eGP "Latest Tenders" bulletin board.
 *
 * Source scope (see docs/ETHICS.md and docs/PROCUREMENT_KNOWLEDGE_CENTRE.md):
 * - Only the public, unauthenticated Latest Tenders listing at
 *   https://egp.praz.org.zw/egp-SW5kZXhlcy9pbmRleA== and its paginated
 *   variants. No login, no bid documents, no authenticated area.
 * - Fetched politely: a real delay between requests, a descriptive
 *   User-Agent, and no concurrent/parallel hammering.
 *
 * NOTE: this was written against the live table structure confirmed on
 * 2026-07-25 (columns: Tender Id, Tender Reference Number, Tender Title,
 * Required Supplier Category Code, Required Supplier Category Name,
 * Procuring Entity, Scope, Publish Date, Closing Date — in that order).
 * PRAZ's site could change its markup at any time; if scrapeListingPage
 * starts returning zero rows, inspect the live page source and adjust the
 * selectors below before assuming something else is wrong.
 */

const BASE_URL = "https://egp.praz.org.zw";
const LISTING_PATH = "egp-SW5kZXhlcy9pbmRleA==";
const USER_AGENT =
  "TenderReachBot/1.0 (+https://tenderreach.example — civic-tech tender index for Zimbabwean suppliers; contact: tenderreach.info@gmail.com)";

// Politeness delay between page fetches, in milliseconds. Do not lower
// this to speed up scraping — see docs/ETHICS.md on respectful access.
const REQUEST_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPageUrl(pageNumber) {
  if (pageNumber <= 1) {
    return `${BASE_URL}/${LISTING_PATH}`;
  }
  return `${BASE_URL}/index?url=${encodeURIComponent(LISTING_PATH)}&page=${pageNumber}&direction=BulletinBoardLive.id`;
}

/**
 * Parses PRAZ's date format, e.g. "13-Dec-2025 06:00 AM", into an ISO
 * string. Returns null if the format doesn't match (rather than throwing),
 * so one malformed date doesn't abort an entire scrape run.
 */
function parsePrazDate(raw) {
  if (!raw) return null;
  const match = raw
    .trim()
    .match(/^(\d{1,2})-(\w{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const [, day, monStr, year, hourStr, minute, ampm] = match;
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const month = months[monStr.toLowerCase()];
  if (month === undefined) return null;

  let hour = parseInt(hourStr, 10);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

  const date = new Date(Date.UTC(parseInt(year, 10), month, parseInt(day, 10), hour, parseInt(minute, 10)));
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Fetches one listing page and parses it into an array of tender objects.
 * Also returns the total page count parsed from the "Page X of Y" text,
 * so the caller knows when to stop.
 */
async function scrapeListingPage(pageNumber) {
  const url = buildPageUrl(pageNumber);
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": USER_AGENT },
    timeout: 15000,
  });

  const $ = cheerio.load(html);
  const tenders = [];

  // Find the table whose header row mentions "Tender Id" — avoids
  // depending on a specific class name that may change.
  let targetTable = null;
  $("table").each((_, table) => {
    const headerText = $(table).find("tr").first().text();
    if (/Tender\s*Id/i.test(headerText)) {
      targetTable = table;
      return false; // break out of .each
    }
  });

  if (!targetTable) {
    return { tenders: [], totalPages: null };
  }

  const rows = $(targetTable).find("tr").slice(1); // skip header row
  rows.each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 9) return; // skip malformed/empty rows

    const idCell = $(cells[0]);
    const link = idCell.find("a").attr("href") || "";
    const idMatch = link.match(/viewLiveTenderDetails\/(\d+)/);
    const tenderId = idMatch ? idMatch[1] : idCell.text().trim();

    tenders.push({
      tender_id: tenderId,
      reference_number: $(cells[1]).text().trim(),
      title: $(cells[2]).text().trim(),
      category_codes: $(cells[3]).text().trim(),
      category_names: $(cells[4]).text().trim(),
      procuring_entity: $(cells[5]).text().trim(),
      scope: $(cells[6]).text().trim(),
      publish_date: parsePrazDate($(cells[7]).text().trim()),
      closing_date: parsePrazDate($(cells[8]).text().trim()),
      source_url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
    });
  });

  const pageInfoMatch = $("body").text().match(/Page\s+\d+\s+of\s+(\d+)/i);
  const totalPages = pageInfoMatch ? parseInt(pageInfoMatch[1], 10) : null;

  return { tenders, totalPages };
}

/**
 * Scrapes every page of the Latest Tenders listing, respecting
 * REQUEST_DELAY_MS between each request.
 *
 * @param {number} maxPages - safety cap so a scrape never runs unbounded
 *   if page-count parsing fails for some reason. Defaults to 60 (PRAZ
 *   had ~50 pages / ~980 tenders as of 2026-07-25).
 */
async function scrapeAllListings(maxPages = 60) {
  const allTenders = [];
  let page = 1;
  let totalPages = null;

  while (page <= maxPages) {
    console.log(`[scrapePraz] Fetching listing page ${page}...`);
    const { tenders, totalPages: parsedTotal } = await scrapeListingPage(page);

    if (tenders.length === 0) {
      console.log(`[scrapePraz] No rows found on page ${page} — stopping.`);
      break;
    }

    allTenders.push(...tenders);
    if (parsedTotal) totalPages = parsedTotal;

    if (totalPages && page >= totalPages) break;

    page += 1;
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`[scrapePraz] Done. Collected ${allTenders.length} tenders across ${page} page(s).`);
  return allTenders;
}

module.exports = { scrapeAllListings, scrapeListingPage, parsePrazDate, buildPageUrl };
