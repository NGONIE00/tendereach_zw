const { formatForChat, FORMATTING_RULES } = require("./formatForChat");

describe("formatForChat", () => {
  test("converts star bullets to • bullets", () => {
    expect(formatForChat("* First\n* Second")).toBe("• First\n• Second");
  });

  test("converts dash and plus bullets too", () => {
    expect(formatForChat("- One\n+ Two")).toBe("• One\n• Two");
  });

  test("indents nested bullets with ◦", () => {
    expect(formatForChat("* Parent\n    * Child")).toBe("• Parent\n   ◦ Child");
  });

  test("removes bold markers but keeps the words", () => {
    expect(formatForChat("**Tax clearance:** required")).toBe("Tax clearance: required");
  });

  test("handles a bullet that starts with a bold label", () => {
    expect(formatForChat("* **Documents:** bring copies")).toBe("• Documents: bring copies");
  });

  test("turns markdown headings into a plain label line", () => {
    expect(formatForChat("## What you need")).toBe("What you need:");
    expect(formatForChat("### Already has a colon:")).toBe("Already has a colon:");
  });

  test("keeps numbered lists intact", () => {
    expect(formatForChat("1. Register\n2. Bid")).toBe("1. Register\n2. Bid");
  });

  test("converts markdown links to label (url)", () => {
    expect(formatForChat("See [the PRAZ site](https://egp.praz.org.zw) now")).toBe(
      "See the PRAZ site (https://egp.praz.org.zw) now"
    );
  });

  test("drops horizontal rules", () => {
    expect(formatForChat("One\n---\nTwo")).toBe("One\n\nTwo");
  });

  test("removes backticks", () => {
    expect(formatForChat("Use `eGP` to apply")).toBe("Use eGP to apply");
  });

  test("collapses runs of blank lines", () => {
    expect(formatForChat("A\n\n\n\n\nB")).toBe("A\n\nB");
  });

  test("never leaves an asterisk behind", () => {
    const messy = "**Bold** and *italic* and 5 * 3\n* item\n  * sub\n*Note:* ok";
    expect(formatForChat(messy)).not.toContain("*");
  });

  test("is idempotent", () => {
    const messy = "## Steps\n* **One:** do this\n    * detail\n\n\n1. Next";
    const once = formatForChat(messy);
    expect(formatForChat(once)).toBe(once);
  });

  test("leaves already-clean chat text unchanged", () => {
    const clean = "📄 Documents you need:\n\n• Tax clearance\n• Company registration\n\n1. Register\n2. Bid";
    expect(formatForChat(clean)).toBe(clean);
  });

  test("returns an empty string for non-strings", () => {
    expect(formatForChat(undefined)).toBe("");
    expect(formatForChat(null)).toBe("");
  });

  test("formatting rules forbid asterisks and describe bullets", () => {
    expect(FORMATTING_RULES).toContain("Never use asterisks");
    expect(FORMATTING_RULES).toContain("•");
  });
});
