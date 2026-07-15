// Testing normalizeYesNo indirectly by re-requiring the module internals
// isn't possible since it's not exported (kept private deliberately).
// Instead we test it via a small exported wrapper for testability.
const { __test__ } = require("./airtable");

describe("normalizeYesNo (Q3 answer normalization)", () => {
  test('answers starting with "y" normalize to Yes', () => {
    expect(__test__.normalizeYesNo("Yes")).toBe("Yes");
    expect(__test__.normalizeYesNo("yes, many times")).toBe("Yes");
  });

  test('answers starting with "n" normalize to No', () => {
    expect(__test__.normalizeYesNo("No")).toBe("No");
    expect(__test__.normalizeYesNo("never")).toBe("No");
  });

  test('answers indicating occasional supply normalize to Occasionally', () => {
    expect(__test__.normalizeYesNo("Occasionally")).toBe("Occasionally");
  });

  test("unrecognized free text is left as-is for manual review", () => {
    expect(__test__.normalizeYesNo("only once in 2019")).toBe("only once in 2019");
  });

  test("empty/undefined input returns an empty string", () => {
    expect(__test__.normalizeYesNo("")).toBe("");
    expect(__test__.normalizeYesNo(undefined)).toBe("");
  });
});
<<<<<<< HEAD

describe("capitalize (Channel field mapping)", () => {
  test("capitalizes the first letter of a channel name", () => {
    expect(__test__.capitalize("whatsapp")).toBe("Whatsapp");
    expect(__test__.capitalize("messenger")).toBe("Messenger");
    expect(__test__.capitalize("instagram")).toBe("Instagram");
  });

  test("empty/undefined input returns an empty string", () => {
    expect(__test__.capitalize("")).toBe("");
    expect(__test__.capitalize(undefined)).toBe("");
  });
});
=======
>>>>>>> 91cf82ea2ebc1ddb33cc55fed080127e6a650420
