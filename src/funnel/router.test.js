const { route } = require("./router");
const messages = require("./messages");

function freshSession(overrides = {}) {
  return {
    phoneNumber: "263700000000",
    currentPath: null,
    interviewStep: 0,
    interviewAnswers: [],
    internalTag: "Cold Lead",
    aiConversationHistory: [],
    ...overrides,
  };
}

describe("top-level menu routing", () => {
  test("choosing 1 starts the Founding Supplier interview with a progress indicator", () => {
    const { reply, sessionUpdates } = route(freshSession(), "1");
    expect(reply).toContain("Question 1 of 7");
    expect(reply).toContain(messages.path1.questions[0]);
    expect(sessionUpdates.currentPath).toBe("path1");
    expect(sessionUpdates.interviewStep).toBe(1);
    expect(sessionUpdates.internalTag).toBe("Founding Lead");
  });

  test("choosing 2 enters the procurement question path with a fresh conversation history", () => {
    const { reply, sessionUpdates } = route(freshSession(), "2");
    expect(reply).toBe(messages.path2.prompt);
    expect(sessionUpdates.currentPath).toBe("path2");
    expect(sessionUpdates.aiConversationHistory).toEqual([]);
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
  test("progresses through all 7 questions, each with a correct progress indicator, and completes", () => {
    let session = freshSession({ currentPath: "path1", interviewStep: 1 });

    for (let i = 1; i <= 6; i++) {
      const { reply, sessionUpdates } = route(session, `answer to Q${i}`);
      expect(reply).toContain(`Question ${i + 1} of 7`);
      expect(reply).toContain(messages.path1.questions[i]);
      session = { ...session, ...sessionUpdates };
    }

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

describe("Path 2 (Ask a procurement question) — redesigned, no more state machine", () => {
  test("a real question signals __needsAiAnswer instead of replying directly", () => {
    const session = freshSession({ currentPath: "path2" });
    const { reply, sessionUpdates } = route(session, "How do I register as a supplier?");

    expect(reply).toBeNull();
    expect(sessionUpdates.__needsAiAnswer).toBe(true);
    expect(sessionUpdates.__aiQuestion).toBe("How do I register as a supplier?");
    expect(sessionUpdates.internalTag).toBe("Active User");
  });

  test("a follow-up question also reaches the AI — no forced menu in between", () => {
    const session = freshSession({ currentPath: "path2" });
    const { reply, sessionUpdates } = route(session, "What about for construction tenders specifically?");

    expect(reply).toBeNull();
    expect(sessionUpdates.__needsAiAnswer).toBe(true);
  });

  test("a bare number does NOT reach the AI — prevents the old infinite-loop bug", () => {
    const session = freshSession({ currentPath: "path2" });
    const { reply, sessionUpdates } = route(session, "2");

    expect(reply).toBe(messages.path2.needsRealQuestion);
    expect(sessionUpdates.__needsAiAnswer).toBeUndefined();
  });

  test("a very short scrap of text does NOT reach the AI", () => {
    const session = freshSession({ currentPath: "path2" });
    const { reply, sessionUpdates } = route(session, "ok");

    expect(reply).toBe(messages.path2.needsRealQuestion);
    expect(sessionUpdates.__needsAiAnswer).toBeUndefined();
  });

  describe("farewell detection", () => {
    const farewells = ["thanks", "Thank you", "thankyou", "bye", "Goodbye", "done", "that's all", "no thanks"];

    test.each(farewells)('"%s" ends the conversation gracefully instead of being sent to the AI', (phrase) => {
      const session = freshSession({ currentPath: "path2" });
      const { reply, sessionUpdates } = route(session, phrase);

      expect(reply).toBe(messages.path2.farewell);
      expect(sessionUpdates.__needsAiAnswer).toBeUndefined();
      expect(sessionUpdates.currentPath).toBeNull();
      expect(sessionUpdates.aiConversationHistory).toEqual([]);
    });

    test('a question that happens to contain "thanks" mid-sentence is NOT treated as a farewell', () => {
      const session = freshSession({ currentPath: "path2" });
      const { reply, sessionUpdates } = route(session, "Thanks, but what documents do I need to bid?");

      expect(reply).toBeNull();
      expect(sessionUpdates.__needsAiAnswer).toBe(true);
    });
  });
});

describe("Path 3 (Learn what Tender Reach does)", () => {
  test('replying "1" to the CTA routes into the Founding Supplier interview', () => {
    const session = freshSession({ currentPath: "path3" });
    const { reply, sessionUpdates } = route(session, "1");
    expect(reply).toContain("Question 1 of 7");
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
