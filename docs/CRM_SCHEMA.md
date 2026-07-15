# Supplier Intelligence CRM — Airtable Schema

This defines the two-table structure required by the Two-Tier Supplier Data Model in `docs/ETHICS.md`. Build these as two separate Airtable tables in the TenderReach workspace — do not merge them into one table with a "status" field, since the whole point is that different fields are *allowed to exist* depending on tier.

---

## Table 1 — Prospects

Purpose: an outreach list. Nothing here implies the business has engaged with TenderReach yet.

| Field | Type | Notes |
|---|---|---|
| Company Name | Single line text | Required |
| Industry | Single select | ICT, Construction, Medical, Security, Engineering, Agriculture, Cleaning Services, Office Supplies, Furniture, Logistics, Automotive, Manufacturing, Other |
| Province | Single select | Zimbabwe's 10 provinces |
| City | Single line text | |
| Phone | Phone number | Only if publicly listed by the business |
| WhatsApp | Phone number | Only if publicly listed |
| Email | Email | Only if publicly listed |
| Website | URL | |
| Source | Single select | Business directory, Chamber/SME association, Company website, LinkedIn, Facebook, Instagram, Google Maps, Direct referral, Field research |
| Date Added | Date | Auto-populated |
| Outreach Status | Single select | Not Contacted, Contacted, No Response, Declined, Converted to Founding Supplier |
| Last Contacted | Date | |
| Removal Requested | Checkbox | If checked, delete the record — do not just archive |

**Explicitly excluded from this table:** procurement history, government/NGO/private supplier status, pain points, interview notes, pilot programme status. If you find yourself wanting to add one of these fields here, that record belongs in Table 2 instead — it means the business has told you something, which means they've engaged.

---

## Table 2 — Founding Suppliers

Purpose: real profiles, created only once a business has responded to outreach, replied to the WhatsApp funnel, or submitted the Airtable onboarding form.

| Field | Type | Notes |
|---|---|---|
| Linked Prospect | Link to Prospects table | If they originated from outreach; optional, since some arrive directly via WhatsApp/organic |
| Company Name | Single line text | Required — for automated WhatsApp intake (Q1), may arrive blank pending manual split, see Contact Name note below |
| Contact Name | Single line text | From interview Q1 — stored as raw text initially (may include both personal name and company name together); split into Contact Name / Company Name on manual review until the AI layer can parse this reliably. |
| Channel | Single select | WhatsApp, Messenger, Instagram — see `docs/MULTI_CHANNEL_ARCHITECTURE.md` |
| Contact ID | Single line text | `${channel}:${externalId}` — the stable lookup key used for deletion requests across all channels |
| Industry | Single select | Same list as Prospects |
| Products/Services Offered | Long text | From interview Q2 |
| Province / City | Single select + text | |
| Company Size | Single select | Micro, Small, Medium, Large |
| Phone / WhatsApp / Email / Website | Contact fields | Phone is only populated when Channel = WhatsApp (auto-filled on interview completion); the others remain manual/optional |
| LinkedIn / Facebook / Instagram / Google Maps | URL fields | Optional, only if the supplier shares them |
| Government Supplier Status | Single select | Yes, No, Occasionally |
| NGO Supplier Status | Single select | Yes, No, Occasionally |
| Private Sector Supplier Status | Single select | Yes, No, Occasionally |
| How They Discover Tenders | Long text | From interview Q4 |
| Hardest Part of Applying | Long text | From interview Q5 |
| Deadline Experience | Long text | From interview Q6 |
| Top Problem to Solve | Long text | From interview Q7 |
| Consent Given | Checkbox | Must be checked before any interview data is entered — see `docs/ETHICS.md` Consent section |
| Interview Status | Single select | Not Started, In Progress, Completed, Stopped Early |
| Pilot Programme Status | Single select | Not Invited, Invited, Active, Declined |
| Internal Tag | Single select | Founding Lead, Active User, Warm Lead, Pilot User, Cold Lead — see `docs/WHATSAPP_FUNNEL.md` |
| Notes | Long text | Free-form relationship notes |
| Last Contacted | Date | |
| Deletion Requested | Checkbox | If checked, delete the record fully, including from any linked Prospect entry |

---

## Workspace Structure Reference

```
TenderReach Workspace
└── Supplier Intelligence CRM (Base)
    ├── Prospects (table)
    ├── Founding Suppliers (table)
    ├── Industry Classifications (linked/lookup table, shared by both)
    └── Province Classifications (linked/lookup table, shared by both)
```

## Moving a record from Prospects to Founding Suppliers

1. Prospect responds to outreach, replies "1" (Join Founding Supplier Programme) on WhatsApp, or submits the Airtable form.
2. Create a new record in **Founding Suppliers**, linked back to the originating **Prospects** record.
3. Update the Prospects record's Outreach Status to "Converted to Founding Supplier."
4. Only now begin populating procurement-history and interview fields — never before this point.

## Deletion requests

If a deletion request comes in (via WhatsApp "delete my data" or directly), delete both the Founding Supplier record and, if requested, the linked Prospect record — don't leave an orphaned entry in either table.
