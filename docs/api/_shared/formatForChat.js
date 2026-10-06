/**
 * Keeps AI replies clean in plain-text chat surfaces (WhatsApp and the
 * website chat widget). Gemini writes Markdown by default — "* item"
 * bullets, **bold**, "## headings" — and neither surface renders it, so
 * the symbols show up as literal stars and hashes.
 *
 * Two layers, because prompts alone aren't a guarantee:
 *   1. FORMATTING_RULES is appended to the system instruction so the
 *      model writes in a chat-friendly style to begin with.
 *   2. formatForChat() cleans whatever comes back, deterministically.
 *
 * Keep in sync BY HAND across:
 *   src/ai/formatForChat.js
 *   docs/api/_shared/formatForChat.js
 * (and the inline copy inside docs/api/ask.js, which can't import it).
 */

const FORMATTING_RULES = `FORMATTING — your reply is shown as plain text in a chat, not a web page:
- Never use asterisks (* or **) anywhere. Never use # headings, tables or backticks.
- For lists, put each item on its own line starting with "• " (a bullet and a space).
- For steps that happen in order, use "1.", "2.", "3." with each step on its own line.
- To label a section, write a short line ending with a colon (you may start it with one relevant emoji, used sparingly), then the list or text underneath.
- Keep lines short, leave a blank line between sections, and make the whole reply easy to scan on a phone.`;

function formatForChat(input) {
  if (typeof input !== "string") return "";

  let text = input.replace(/\r\n/g, "\n");

  // Code fences and inline code -> plain text
  text = text.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, "$1");
  text = text.replace(/`([^`\n]+)`/g, "$1");

  // Markdown links -> "label (url)"
  text = text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)");

  const lines = text.split("\n").map((line) => {
    // "## Title" -> "Title:"
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const label = heading[1].replace(/[*_]+/g, "").trim();
      return /[:.!?]$/.test(label) ? label : label + ":";
    }

    // Horizontal rules: ---, ***, ___
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) return "";

    // Bullets: "* x", "- x", "+ x" or an existing bullet; indented = nested
    const bullet = line.match(/^(\s*)([*+\-•◦▪])\s+(.*)$/);
    if (bullet) {
      const indent = bullet[1].replace(/\t/g, "    ").length;
      return (indent >= 2 ? "   ◦ " : "• ") + bullet[3];
    }

    return line;
  });

  text = lines.join("\n");

  // Emphasis markers: keep the words, drop the symbols
  text = text.replace(/__([^_\n]+?)__/g, "$1");
  text = text.replace(/\*+/g, "");

  // Tidy whitespace
  text = text.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

module.exports = { formatForChat, FORMATTING_RULES };
