const { checkRateLimit, resetAll } = require("./rateLimiter");

describe("rateLimiter", () => {
  beforeEach(() => {
    resetAll();
  });

  test("allows messages under the limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("263700000010");
      expect(result.allowed).toBe(true);
    }
  });

  test("blocks messages once the limit is exceeded", () => {
    const max = parseInt(process.env.RATE_LIMIT_MAX_MESSAGES || "20", 10);
    for (let i = 0; i < max; i++) {
      checkRateLimit("263700000011");
    }
    const result = checkRateLimit("263700000011");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  test("tracks each phone number independently", () => {
    const max = parseInt(process.env.RATE_LIMIT_MAX_MESSAGES || "20", 10);
    for (let i = 0; i < max; i++) {
      checkRateLimit("263700000012");
    }
    // A different number should be unaffected.
    const result = checkRateLimit("263700000013");
    expect(result.allowed).toBe(true);
  });

  test("repeated over-limit attempts don't reset or extend the window", () => {
    const max = parseInt(process.env.RATE_LIMIT_MAX_MESSAGES || "20", 10);
    for (let i = 0; i < max; i++) {
      checkRateLimit("263700000014");
    }
    const first = checkRateLimit("263700000014");
    const second = checkRateLimit("263700000014");
    expect(first.allowed).toBe(false);
    expect(second.allowed).toBe(false);
  });
});
