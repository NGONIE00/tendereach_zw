# Source layout (Phase 1 MVP)

- `whatsapp/` — inbound/outbound WhatsApp Business API handling. Receives forwarded tender text, sends summaries/reminders back.
- `ai/` — prompt templates and calls to the AI provider for plain-language summarization and checklist extraction. Keep prompts in version control (no secrets); keep API keys in `.env` only.
- `db/` — minimal persistence: phone number (hashed or encrypted at rest where possible), active reminders, retention-timestamp logic per `docs/ETHICS.md`.

Nothing here yet — this is the scaffold. Before writing the first real handler, re-read `docs/ETHICS.md` retention section so the schema is designed around deletion from day one, not bolted on later.
