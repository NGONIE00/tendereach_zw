# WhatsApp Welcome Funnel — Message Reference

Ready-to-paste message set for TenderReach's WhatsApp Business profile. This is the source of truth for funnel copy — update here first, then copy into WhatsApp, so this file and the live bot never drift apart.

Every message here is written to stay consistent with `docs/ETHICS.md`. If you change wording that touches consent, retention, or data collection, update `docs/ETHICS.md` in the same edit.

---

## 🔵 Entry Point — Welcome Message

Triggered when a user sends "START" or messages the account for the first time.

```
👋 Welcome to Tender Reach

We help Zimbabwean businesses discover, understand, and prepare for public procurement opportunities.

Our goal is simple: make tender participation easier, clearer, and more successful.

To get started, choose an option below:

1️⃣ Join Founding Supplier Programme (Interview + Early Access)
2️⃣ Ask a Procurement Question
3️⃣ Learn What Tender Reach Does
4️⃣ Speak to Our Team
```

---

## 🟢 Path 1 — Founding Supplier Programme

### Intro + consent (send before Q1 — do not skip this)

```
Great choice 🚀

We're inviting a small group of suppliers to help shape Tender Reach. This takes about 8–10 minutes and helps us understand your procurement experience.

A quick note before we start: your answers are saved and used only to guide what we build. We never sell or share them outside the team. You can stop at any time by replying "stop" — anything you've already shared stays covered by this same promise.

Let's begin.
```

### Interview questions (send one at a time, wait for reply)

```
Q1. What is your name and your company name?
```
```
Q2. What products or services does your company provide?
```
```
Q3. Have you ever supplied government before? (Yes / No / Occasionally)
```
```
Q4. How do you usually find tenders?
```
```
Q5. What is the hardest part of applying for tenders?
```
```
Q6. Have you ever missed a tender deadline? What happened?
```
```
Q7. If Tender Reach could solve ONE problem for you, what should it be?
```

### If user replies "stop" or "skip" partway through

```
No problem — thanks for sharing what you did 🙏 Nothing further will be asked. What you've already shared will still help shape Tender Reach, under the same terms as before. You can return to the full interview anytime by replying "START".
```

### End message (after Q7 is answered)

```
🙏 Thank you for sharing your experience.

We've saved your responses and they will directly shape what we build. Based on your answers, we'll soon share early access tools designed for your needs.

You are now part of the Tender Reach Founding Supplier Circle ⭐
```

**Internal tag applied:** `Founding Supplier`, `High Intent User`

---

## 🟡 Path 2 — Ask a Procurement Question

### Prompt

```
Ask us anything about public procurement.

Example:
• "How do I apply for a tender?"
• "What documents do I need?"
• "How do I register as a supplier?"
```

### Placeholder response (until AI/manual answering pipeline is live)

```
Thanks for your question! 🙏 Our full answering system is still being built. For now, please type your question and a real person from our team will get back to you within 24 hours.
```

### Once a real answer has been given — closing prompt

```
Would you like us to also guide you step-by-step through tenders in the Founding Supplier Programme?

1️⃣ Yes
2️⃣ Not now
```

**Internal tag applied:** `Active User` (or `Warm Lead` if they say Yes to the closing prompt)

---

## 🔵 Path 3 — Learn What Tender Reach Does

### Message

```
Tender Reach is building digital tools that help businesses navigate public procurement more easily.

We focus on:
• Tender discovery
• Document guidance
• Supplier support
• AI-powered assistance

Our mission is to make procurement clear, fair, and accessible for all businesses in Zimbabwe 🇿🇼
```

### CTA

```
Would you like to join our Founding Supplier Programme?

1️⃣ Yes
2️⃣ Maybe later
```

**Internal tag applied:** `Warm Lead` if Yes, otherwise no tag change.

---

## 🟣 Path 4 — Speak to Our Team

### Message

```
A member of the Tender Reach team will respond to you shortly.

In the meantime, you can also join our Founding Supplier Programme for faster support and early access tools.
```

**Internal tag applied:** none automatically — handle as a manual follow-up.

---

## 🧠 Internal Lead Tags (Reference Only — Never Shown to Users)

| Action | Tag |
|---|---|
| Starts the Founding Supplier interview | `Founding Lead` |
| Asks a procurement question | `Active User` |
| Shows interest but doesn't commit (e.g. "Maybe later") | `Warm Lead` |
| Completes the Founding Supplier interview | `Pilot User` |
| No response after initial contact | `Cold Lead` |

These tags exist to help prioritize your own follow-up. Per `docs/ETHICS.md`, they are never shared externally, sold, or used to gate access to the core assistant — every user gets the same quality of help regardless of tag.

---

## ⚙️ Future: Smart Auto-Response Layer (Not Yet Built)

Once Phase 1's AI summarization pipeline is live, extend Path 2 with rule-based routing, for example:

- "What is a tender?" → send explanation + Founding Programme CTA
- "How do I apply?" → send checklist + Founding Programme CTA
- Message indicates confusion → route to Founding Programme
- Message indicates advanced procurement knowledge → tag as high-value supplier internally

Do not build this until there's a real answering pipeline behind Path 2 — a placeholder response layered under fake "smart" routing would be misleading. See `docs/ETHICS.md` on being open about what the AI does and doesn't do.
