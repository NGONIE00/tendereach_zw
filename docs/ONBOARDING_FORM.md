# Founding Supplier Onboarding Form — Field Specification

This is the form a prospect fills in directly (shared via WhatsApp, Instagram, LinkedIn, or a direct link) to join the Founding Supplier Programme. Submitting this form is what moves someone from Prospects into the Founding Suppliers table — see `docs/CRM_SCHEMA.md`.

Build this in Airtable Forms (or Google Forms as a fallback) using the exact field order and wording below. The consent line is not optional — it must appear before any interview-style question, per `docs/ETHICS.md`.

---

## Form Copy

### Header

```
Join the Tender Reach Founding Supplier Circle ⭐

We're inviting a small group of Zimbabwean suppliers to help shape Tender Reach before we build. This takes about 5 minutes.

Your answers are saved and used only to guide what we build. We never sell or share them outside the team, and you can request deletion at any time by emailing [contact] or messaging us on WhatsApp.
```

### Section 1 — About Your Business

| Field | Type | Required | Notes |
|---|---|---|---|
| Company Name | Short text | Yes | |
| Contact Name | Short text | Yes | |
| Industry | Single select | Yes | ICT, Construction, Medical, Security, Engineering, Agriculture, Cleaning Services, Office Supplies, Furniture, Logistics, Automotive, Manufacturing, Other |
| Province | Single select | Yes | |
| City/Town | Short text | Yes | |
| Company Size | Single select | No | Micro (1-5), Small (6-20), Medium (21-100), Large (100+) |

### Section 2 — Contact Details

| Field | Type | Required | Notes |
|---|---|---|---|
| Phone Number | Phone | Yes | |
| WhatsApp Number | Phone | No | "Leave blank if same as phone number" |
| Email | Email | No | |
| Website | Short text | No | |

### Section 3 — Procurement Experience

| Field | Type | Required | Notes |
|---|---|---|---|
| Have you supplied government before? | Single select | Yes | Yes / No / Occasionally |
| Have you supplied NGOs before? | Single select | No | Yes / No / Occasionally |
| Have you supplied private sector clients before? | Single select | No | Yes / No / Occasionally |
| How do you currently find tenders? | Long text | Yes | Free text — matches WhatsApp interview Q4 |
| What is the hardest part of applying for tenders? | Long text | Yes | Free text — matches Q5 |
| Have you ever missed a tender deadline? What happened? | Long text | No | Matches Q6 — optional since it may feel sensitive in a form (vs. conversational WhatsApp) |
| If Tender Reach could solve ONE problem for you, what should it be? | Long text | Yes | Matches Q7 |

### Section 4 — Programme Participation

| Field | Type | Required | Notes |
|---|---|---|---|
| Would you like early access to future tools? | Single select | Yes | Yes / Maybe later |
| Can we contact you about joining a pilot test? | Single select | Yes | Yes / Not right now |
| How did you hear about Tender Reach? | Single select | No | Instagram, LinkedIn, WhatsApp, Facebook, Referral, Other — useful for tracking which channel is actually converting |

### Closing message (shown after submission)

```
🙏 Thank you for sharing your experience.

Your responses have been saved and will directly shape what we build. You are now part of the Tender Reach Founding Supplier Circle.

We'll be in touch as early access tools become ready.
```

---

## Where responses go

Form submissions write directly into the **Founding Suppliers** table (`docs/CRM_SCHEMA.md`), not Prospects — submitting this form is itself the opt-in action. Set the following automatically on submission:

- `Consent Given` → checked
- `Interview Status` → Completed
- `Internal Tag` → Founding Lead
- `Date Added` → auto-timestamp

## A note on the deadline question (Section 3)

This question is marked optional here, unlike the WhatsApp version, because a cold-start typed form is a slightly higher-friction, lower-trust context than a back-and-forth WhatsApp conversation — some suppliers may be less willing to disclose a missed deadline in writing to a company they've just met. Keeping it optional avoids losing an otherwise-complete submission over one sensitive question. If useful, you can follow up conversationally on WhatsApp later once trust is established.
