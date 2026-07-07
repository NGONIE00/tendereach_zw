describe("sessionStore.memory", () => {
  let sessionStore;

  beforeEach(() => {
    // Fresh module instance per test so the in-memory Map doesn't leak
    // state between tests.
    jest.resetModules();
    sessionStore = require("./sessionStore.memory");
  });

  test("getSession returns a fresh default session for a new phone number", async () => {
    const session = await sessionStore.getSession("263700000001");
    expect(session.phoneNumber).toBe("263700000001");
    expect(session.currentPath).toBeNull();
    expect(session.interviewStep).toBe(0);
    expect(session.interviewAnswers).toEqual([]);
    expect(session.internalTag).toBe("Cold Lead");
  });

  test("setSession persists updates and getSession reflects them", async () => {
    await sessionStore.setSession("263700000002", { currentPath: "path1", interviewStep: 3 });
    const session = await sessionStore.getSession("263700000002");
    expect(session.currentPath).toBe("path1");
    expect(session.interviewStep).toBe(3);
  });

  test("deleteSession fully removes the session, not just marks it inactive", async () => {
    await sessionStore.setSession("263700000003", { currentPath: "path2" });
    await sessionStore.deleteSession("263700000003");
    const session = await sessionStore.getSession("263700000003");
    // Getting after delete should return a brand-new default session,
    // proving nothing persisted.
    expect(session.currentPath).toBeNull();
    expect(session.interviewStep).toBe(0);
  });

  test("purgeExpiredSessions removes sessions past the retention window", async () => {
    await sessionStore.setSession("263700000004", { currentPath: "path3" });

    // Manually age the session past the retention window by reaching into
    // the module's internal Map via a fresh setSession call with a
    // backdated lastActive — simulated by directly manipulating time.
    const RETENTION_DAYS = parseInt(process.env.TENDER_CONTENT_RETENTION_DAYS || "30", 10);
    const longAgo = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000 + 1000);
    const realNow = Date.now;
    Date.now = () => longAgo;
    await sessionStore.setSession("263700000004", { currentPath: "path3" });
    Date.now = realNow;

    await sessionStore.purgeExpiredSessions();
    const session = await sessionStore.getSession("263700000004");
    expect(session.currentPath).toBeNull(); // fresh default, proving it was purged
  });
});
