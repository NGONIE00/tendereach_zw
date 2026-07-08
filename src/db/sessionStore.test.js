describe("sessionStore switcher", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("falls back to the in-memory store when Supabase env vars are missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const memoryStore = require("./sessionStore.memory");
    const selected = require("./sessionStore");

    // Comparing function references confirms the same module was selected.
    expect(selected.getSession).toBe(memoryStore.getSession);
  });

  test("selects the Supabase store when both env vars are present", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    const supabaseStore = require("./sessionStore.supabase");
    const selected = require("./sessionStore");

    expect(selected.getSession).toBe(supabaseStore.getSession);
  });

  test("falls back to memory store if only one of the two env vars is set", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const memoryStore = require("./sessionStore.memory");
    const selected = require("./sessionStore");

    expect(selected.getSession).toBe(memoryStore.getSession);
  });
});
