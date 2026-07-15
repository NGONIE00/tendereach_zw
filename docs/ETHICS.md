# Digital Ethics & Privacy Commitments

This document translates TenderReach's guiding principles into specific, checkable practices. It follows a four-pillar structure — Privacy, Equity, Sovereignty, Accountability — and each commitment below is meant to be something a developer can actually verify in code, not just aspire to.

If a feature request conflicts with something in this document, the feature is changed or dropped — this document is not overridden by convenience.

---

## Privacy

**What we collect:**
- A phone number (WhatsApp identifier) — required for the assistant to function.
- Tender notice content the user voluntarily forwards or pastes.
- For the Phase 2 tip-line: a report description and, optionally, supporting evidence (text/photo) the submitter chooses to provide.
- For the Founding Supplier Programme (WhatsApp welcome funnel, Path 1): name, company name, products/services offered, prior government-supply experience, how they currently discover tenders, their described pain points, and any deadline-related experience they choose to share. This is a deliberately fuller intake than the general assistant, since its explicit purpose is Phase 0 problem validation — see `docs/ROADMAP.md`. Users are told this up front (see Consent, below) and participation is optional; declining does not block access to the core plain-language assistant (Path 2).
- For the **Prospect List** (outreach sourcing, see "Two-Tier Supplier Data Model" below): company name, industry, general location, and publicly-published business contact info (phone/email/website already listed by the business itself for commercial purposes) sourced from business directories, Chamber of Commerce/SME association listings, company websites, LinkedIn, Facebook, Instagram, and Google Maps business listings. This tier deliberately excludes anything the business hasn't already made public for commercial contact purposes.
- **Across channels (WhatsApp, Messenger, Instagram):** whichever platform a person messages from, we store only that platform's own user identifier (phone number for WhatsApp, a platform-scoped ID for Messenger/Instagram — these are not phone numbers or usable outside that platform) and the conversation content itself. Messaging TenderReach on two different platforms is treated as two separate conversations, not linked or merged — see `docs/MULTI_CHANNEL_ARCHITECTURE.md` for why that's a deliberate simplification rather than an oversight.

**What we do not collect:**
- No location tracking beyond what the user explicitly states in conversation (e.g. "I'm based in Mutare").
- No contact list access, no message history beyond the active conversation, no device data.
- No bulk scraping of PRAZ or any other procurement portal (see `SECURITY.md` and `docs/ROADMAP.md`).
- No scraping or reuse of data from paid tender-aggregation businesses (e.g. Tendertube, TendersInfo, ZimbabweTenders, GlobalTenders, or similar subscription tender-intelligence products). These are commercial products built on curation effort, not public-domain data, and are treated the same as any other competitor's proprietary product — off limits regardless of technical feasibility. Tender content for TenderReach's own features is sourced only from original public sources (PRAZ eGP, the Government Gazette, ministry/parastatal sites) or from content a user voluntarily shares.
- No procurement history, interview data, notes, or relationship/pipeline detail is collected about a business until they have actually responded to outreach or opted in (see "Two-Tier Supplier Data Model" below). Being listed in a public directory is not consent to hold anything beyond basic contact/outreach data.

**Retention:**
- Tender content submitted for summarization is retained only as long as needed to deliver the summary and any active deadline reminder (default: 30 days, configurable via `TENDER_CONTENT_RETENTION_DAYS`), then deleted.
- Tip-line submissions (Phase 2) are retained until the verification process concludes, then either archived (if published as a verified case, with submitter consent) or deleted.
- Phone numbers are stored only as long as the user has an active reminder or open tip; a user can request deletion at any time via a simple in-chat command (e.g. "delete my data").
- Founding Supplier Programme interview responses are retained for as long as the programme is active and are used only to inform TenderReach's own product decisions (Phase 0/1 build priorities). They are not published, shared externally, or sold in any form, individually or aggregated, without separate explicit consent. A participant can request deletion of their interview responses at any time using the same in-chat command.

**Consent:**
- Before first use, the assistant states in plain language what it stores and for how long, and links to this document (or a simplified version of it).
- Before the Founding Supplier interview begins, the user is told in one short message that their answers are saved, used only to shape what TenderReach builds, never sold or shared externally, and that they can stop at any point and anything already shared will still be handled under these same terms.
- The interview includes a clear way to stop partway through (e.g. replying "skip" or "stop") without penalty — a user who exits partway is not treated differently from one who never started.
- Tip-line submitters are explicitly asked whether they consent to their report being referenced (even anonymously) in a published verified case.

**Internal lead tagging (e.g. "Founding Lead," "Warm Lead," "Cold Lead," "Pilot User"):**
- These tags are working labels for TenderReach's own follow-up prioritization only. They are internal notes about engagement stage, not judgments about a person's character or reliability, and they are never shared externally, sold, or used to restrict someone's access to the core assistant.

---

## Two-Tier Supplier Data Model

TenderReach maintains two separate data stores for supplier information, with different rules for each. They must never be merged into a single undifferentiated table.

**Tier 1 — Prospect List**
- Purpose: knowing which businesses to invite into the Founding Supplier Programme.
- Fields: company name, industry, general location (province/city), publicly-published business contact info only.
- Sourced from: business directories, Chamber of Commerce/SME association listings, company websites, LinkedIn, Facebook, Instagram, Google Maps business listings, direct referrals, and field research — never from paid tender-aggregator sites (see above).
- No procurement history, no pain-point notes, no relationship/pipeline status is stored at this tier — that information doesn't exist yet, because the business hasn't told us anything.
- A prospect can ask to be removed from outreach at any time; the request is honored and the record deleted, not just marked inactive.

**Tier 2 — Founding Supplier Record**
- Created only once a prospect responds to outreach, replies to a message, or completes the Airtable onboarding form — i.e., only after they have actively engaged, not merely been found.
- This is where richer fields belong: procurement experience, discovery habits, described pain points, interview responses, pilot programme status, outreach/interview notes.
- Governed by the Consent and Retention terms above, in full.
- A record only moves from Tier 1 to Tier 2 on the basis of the business's own action (a reply, a form submission) — never automatically, and never based on assumptions about interest.

This split exists so that "being findable in a public directory" is never treated as equivalent to "having given TenderReach permission to hold a profile" on a business. The former is normal, low-risk B2B outreach practice; the latter carries real obligations under Zimbabwe's Data Protection Act (2021), particularly around direct marketing and processing of personal/business data, and under TenderReach's own Sovereignty commitment below.

---

## Equity

- **No paywall, no premium tier that gates core tender-summary/reminder functionality.** If a sustainability model is introduced later, it must not create a two-tier system where poorer suppliers get worse information.
- **Plain language by design.** Summaries are written for a reader without procurement training — this is the core equity function of the product, not a nice-to-have.
- **Channel accessibility.** WhatsApp was chosen deliberately for low data cost and wide reach in Zimbabwe, including rural/lower-connectivity users, over a web-only or app-only design.
- **Language.** English is the starting point; Shona and Ndebele support should be treated as a near-term roadmap item, not a someday item, given the project's stated commitment to linguistic sovereignty.

## Sovereignty

- **Data stays governable by the people it's about.** Suppliers and citizens can request export or deletion of their own data on demand.
- **No sale or third-party transfer of user data.** This is a hard line — no ad networks, no data brokers, no "anonymized" bulk resale.
- **Local framing, not extractive framing.** TenderReach is built to strengthen Zimbabwean suppliers' position relative to the procurement system, not to build a dataset whose primary value accrues elsewhere (e.g. to a foreign buyer of "market intelligence").
- **PRAZ's data ownership is respected explicitly.** Per PRAZ's own Terms & Conditions, procurement Information is owned by PRAZ or the issuing government agency. TenderReach does not claim ownership over any tender notice content — only over the plain-language summary/derivative work it generates from content a user shared with it.

## Accountability

- **This document is versioned.** Material changes to data practices require a dated changelog entry below, not a silent edit.
- **A correction process exists before any public claim is published.** Any Phase 2 verified case, once public, includes a clear channel for the referenced supplier or agency to dispute or respond.
- **No scoring or reputational claims (Phase 4) without a named legal review step completed first.** This is enforced as a project milestone, not left to individual judgment under deadline pressure.
- **Open about what the AI does and doesn't do.** The plain-language summary is clearly labeled as AI-generated and as a supplementary aid, not a substitute for reading the original tender document or seeking professional procurement advice for high-value bids.

---

## Changelog

- **[Init]** — Document created alongside initial repo scaffold. No prior versions.
- **[2026-07-06]** — Added explicit coverage of the Founding Supplier Programme interview (WhatsApp welcome funnel, Path 1): expanded data collection scope, retention terms, pre-interview consent line, skip/stop option, and a note on internal lead-tagging practices.
- **[2026-07-07]** — Introduced the Two-Tier Supplier Data Model (Prospect List vs. Founding Supplier Record) to govern the Supplier Intelligence CRM; explicitly excluded scraping/reuse of paid tender-aggregator products (e.g. Tendertube, TendersInfo) as an off-limits data source.
- **[2026-07-07]** — Replaced the in-memory-only session store with a Supabase-backed implementation (see `supabase/migrations/001_whatsapp_sessions.sql`), so the retention window and "delete my data" guarantees above now hold across server restarts, not just within a single running process. In-memory storage remains as a local-development fallback only.
- **[2026-07-14]** — Introduced multi-channel support (Messenger, Instagram, in addition to WhatsApp) via a shared funnel core; documented that platform-scoped identifiers are stored per-channel and not linked/merged across platforms. See `docs/MULTI_CHANNEL_ARCHITECTURE.md`.
