const { route } = require("./router");
const messages = require("./messages");

function freshSession(overrides = {}) {
  return {
    phoneNumber: "263700000000",
    currentPath: null,
    interviewStep: 0,
    interviewAnswers: [],
    internalTag: "Cold Lead",
    ...overrides,
  };
}

describe("top-level menu routing", () => {
  test("choosing 1 starts the Founding Supplier interview", () => {
    const { reply, sessionUpdates } = route(freshSession(), "1");
    expect(reply).toContain(messages.path1.questions[0]);
    expect(sessionUpdates.currentPath).toBe("path1");
    expect(sessionUpdates.interviewStep).toBe(1);
    expect(sessionUpdates.internalTag).toBe("Founding Lead");
  });

  test("choosing 2 enters the procurement question path", () => {
    const { reply, sessionUpdates } = route(freshSession(), "2");
    expect(reply).toBe(messages.path2.prompt);
    expect(sessionUpdates.currentPath).toBe("path2");
  });

  test("choosing 3 shows info and CTA", () => {
    const { reply, sessionUpdates } = route(freshSession(), "3");
    expect(reply).toContain(messages.path3.info);
    expect(sessionUpdates.currentPath).toBe("path3");
  });

  test("choosing 4 shows the speak-to-team message", () => {
    const { reply, sessionUpdates } = route(freshSession(), "4");
    expect(reply).toBe(messages.path4.message);
    expect(sessionUpdates.currentPath).toBe("path4");
  });

  test("an invalid choice returns the invalid-menu message", () => {
    const { reply } = route(freshSession(), "banana");
    expect(reply).toBe(messages.invalidMenuChoice);
  });
});

describe("global commands", () => {
  test('"menu" resets to the welcome message from any state', () => {
    const midInterview = freshSession({ currentPath: "path1", interviewStep: 3 });
    const { reply, sessionUpdates } = route(midInterview, "menu");
    expect(reply).toBe(messages.welcome);
    expect(sessionUpdates.currentPath).toBeNull();
  });

  test('"delete my data" signals session deletion', () => {
    const { reply, sessionUpdates } = route(freshSession(), "delete my data");
    expect(reply).toBe(messages.dataDeletionConfirmed);
    expect(sessionUpdates.__deleteSession).toBe(true);
  });
});

describe("Founding Supplier interview flow (Path 1)", () => {
  test("progresses through all 7 questions and completes", () => {
    let session = freshSession({ currentPath: "path1", interviewStep: 1 });

    for (let i = 1; i <= 6; i++) {
      const { reply, sessionUpdates } = route(session, `answer to Q${i}`);
      expect(reply).toBe(messages.path1.questions[i]); // next question
      session = { ...session, ...sessionUpdates };
    }

    // Answer Q7 (final question) — should complete the interview.
    const final = route(session, "answer to Q7");
    expect(final.reply).toBe(messages.path1.complete);
    expect(final.sessionUpdates.currentPath).toBeNull();
    expect(final.sessionUpdates.internalTag).toBe("Pilot User");
    expect(final.sessionUpdates.__interviewCompleted).toBe(true);
    expect(final.sessionUpdates.interviewAnswers).toHaveLength(7);
  });

  test('replying "stop" mid-interview exits gracefully without penalty', () => {
    const midInterview = freshSession({ currentPath: "path1", interviewStep: 3 });
    const { reply, sessionUpdates } = route(midInterview, "stop");
    expect(reply).toBe(messages.path1.stoppedEarly);
    expect(sessionUpdates.currentPath).toBeNull();
  });

  test('replying "skip" mid-interview behaves the same as "stop"', () => {
    const midInterview = freshSession({ currentPath: "path1", interviewStep: 5 });
    const { reply } = route(midInterview, "skip");
    expect(reply).toBe(messages.path1.stoppedEarly);
  });
});

describe("Path 2 (Ask a procurement question)", () => {
  test("first message after entering path2 gets the placeholder + closing prompt", () => {
    const session = freshSession({ currentPath: "path2" });
    const { reply } = route(session, "How do I register as a supplier?");
    expect(reply).toContain(messages.path2.placeholder);
    expect(reply).toContain(messages.path2.closingPrompt);
  });

  test('replying "1" to the closing prompt routes into the Founding Supplier interview', () => {
    const session = freshSession({ currentPath: "path2" });
    const { reply, sessionUpdates } = route(session, "1");
    expect(reply).toContain(messages.path1.questions[0]);
    expect(sessionUpdates.currentPath).toBe("path1");
    expect(sessionUpdates.internalTag).toBe("Warm Lead");
  });

  test('replying "2" to the closing prompt returns to the main menu', () => {
    const session = freshSession({ currentPath: "path2" });
    const { reply, sessionUpdates } = route(session, "2");
    expect(reply).toBe(messages.welcome);
    expect(sessionUpdates.currentPath).toBeNull();
  });
});

describe("Path 3 (Learn what Tender Reach does)", () => {
  test('replying "1" to the CTA routes into the Founding Supplier interview', () => {
    const session = freshSession({ currentPath: "path3" });
    const { sessionUpdates } = route(session, "1");
    expect(sessionUpdates.currentPath).toBe("path1");
    expect(sessionUpdates.internalTag).toBe("Warm Lead");
  });

  test('replying "2" (Maybe later) returns to the main menu', () => {
    const session = freshSession({ currentPath: "path3" });
    const { reply, sessionUpdates } = route(session, "2");
    expect(reply).toBe(messages.welcome);
    expect(sessionUpdates.currentPath).toBeNull();
  });
});
