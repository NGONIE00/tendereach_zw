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

**What we do not collect:**
- No location tracking beyond what the user explicitly states in conversation (e.g. "I'm based in Mutare").
- No contact list access, no message history beyond the active conversation, no device data.
- No bulk scraping of PRAZ or any other procurement portal (see `SECURITY.md` and `docs/ROADMAP.md`).

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
