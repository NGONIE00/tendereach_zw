jest.mock("../db/sessionStore");
jest.mock("../db/airtable");
jest.mock("../ai/answerProcurementQuestion");

const sessionStore = require("../db/sessionStore");
const airtable = require("../db/airtable");
const { answerProcurementQuestion } = require("../ai/answerProcurementQuestion");
const { processIncomingMessage } = require("./core");
const messages = require("./messages");
const { resetAll } = require("./rateLimiter");

function freshSession(overrides = {}) {
  return {
    currentPath: null,
    interviewStep: 0,
    interviewAnswers: [],
    internalTag: "Cold Lead",
    awaitingClosingReply: false,
    ...overrides,
  };
}

describe("processIncomingMessage (shared funnel core)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAll();
  });

  test("routes a top-level menu choice and sends the reply via the channel's sendFn", async () => {
    sessionStore.getSession.mockResolvedValue(freshSession());
    sessionStore.setSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
    const sendFn = jest.fn().mockResolvedValue();

    await processIncomingMessage("whatsapp", "263700000001", "2", sendFn);

    expect(sendFn).toHaveBeenCalledWith("263700000001", messages.path2.prompt);
  });

  test("on interview completion, persists to Airtable with channel and external ID", async () => {
    const completedSession = freshSession({
      interviewAnswers: ["Jane / Acme Co", "Cleaning", "Yes", "Facebook group", "Paperwork", "", "Faster replies"],
      internalTag: "Pilot User",
    });
    sessionStore.getSession.mockResolvedValue(
      freshSession({ currentPath: "path1", interviewStep: 7 })
    );
    sessionStore.setSession.mockResolvedValue(completedSession);
    airtable.createFoundingSupplierRecord.mockResolvedValue([{ id: "rec123" }]);
    const sendFn = jest.fn().mockResolvedValue();

    await processIncomingMessage("instagram", "ig-user-1", "Faster replies", sendFn);

    expect(airtable.createFoundingSupplierRecord).toHaveBeenCalledWith(
      completedSession,
      "instagram",
      "ig-user-1"
    );
    expect(sendFn).toHaveBeenCalledWith("ig-user-1", messages.path1.complete);
  });

  test('"delete my data" clears the session and the Airtable record by contact', async () => {
    sessionStore.getSession.mockResolvedValue(freshSession({ currentPath: "path3" }));
    airtable.deleteFoundingSupplierRecordByContact.mockResolvedValue({ deleted: 1 });
    const sendFn = jest.fn().mockResolvedValue();

    await processIncomingMessage("messenger", "1002003000", "delete my data", sendFn);

    expect(sessionStore.deleteSession).toHaveBeenCalledWith("messenger:1002003000");
    expect(airtable.deleteFoundingSupplierRecordByContact).toHaveBeenCalledWith(
      "messenger",
      "1002003000"
    );
    expect(sendFn).toHaveBeenCalledWith("1002003000", messages.dataDeletionConfirmed);
  });

  test("rate-limited senders get the rate-limit message without touching the session store", async () => {
    const sendFn = jest.fn().mockResolvedValue();
    const maxMessages = parseInt(process.env.RATE_LIMIT_MAX_MESSAGES || "20", 10);

    sessionStore.getSession.mockResolvedValue(freshSession());
    sessionStore.setSession.mockResolvedValue(freshSession());

    for (let i = 0; i < maxMessages; i++) {
      await processIncomingMessage("whatsapp", "263700000099", "menu", sendFn);
    }
    sendFn.mockClear();
    sessionStore.getSession.mockClear();

    await processIncomingMessage("whatsapp", "263700000099", "menu", sendFn);

    expect(sendFn).toHaveBeenCalledWith("263700000099", messages.rateLimited);
    expect(sessionStore.getSession).not.toHaveBeenCalled();
  });

  describe("AI-answered procurement questions (Path 2)", () => {
    test("a real Gemini answer is sent, followed by the closing prompt, and awaitingClosingReply is set", async () => {
      sessionStore.getSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
      sessionStore.setSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
      answerProcurementQuestion.mockResolvedValue(
        "To register as a supplier, you'll need a valid tax clearance certificate..."
      );
      const sendFn = jest.fn().mockResolvedValue();

      await processIncomingMessage("whatsapp", "263700000002", "How do I register as a supplier?", sendFn);

      expect(answerProcurementQuestion).toHaveBeenCalledWith("How do I register as a supplier?");
      const [, sentMessage] = sendFn.mock.calls[0];
      expect(sentMessage).toContain("To register as a supplier");
      expect(sentMessage).toContain(messages.path2.closingPrompt);
      expect(sessionStore.setSession).toHaveBeenCalledWith(
        "whatsapp:263700000002",
        expect.objectContaining({ awaitingClosingReply: true })
      );
    });

    test("falls back to the placeholder message if the AI returns null (not configured or failed)", async () => {
      sessionStore.getSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
      sessionStore.setSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
      answerProcurementQuestion.mockResolvedValue(null);
      const sendFn = jest.fn().mockResolvedValue();

      await processIncomingMessage("whatsapp", "263700000003", "What is a tender?", sendFn);

      const [, sentMessage] = sendFn.mock.calls[0];
      expect(sentMessage).toContain(messages.path2.placeholder);
      expect(sentMessage).toContain(messages.path2.closingPrompt);
    });

    test("falls back to the placeholder message if answerProcurementQuestion throws unexpectedly", async () => {
      sessionStore.getSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
      sessionStore.setSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
      answerProcurementQuestion.mockRejectedValue(new Error("network blip"));
      const sendFn = jest.fn().mockResolvedValue();

      await processIncomingMessage("whatsapp", "263700000004", "What is a tender?", sendFn);

      const [, sentMessage] = sendFn.mock.calls[0];
      expect(sentMessage).toContain(messages.path2.placeholder);
      expect(sendFn).toHaveBeenCalledTimes(1); // still replies exactly once, never breaks silently
    });

    test("does not call Airtable or deletion logic for a plain AI-answered question", async () => {
      sessionStore.getSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
      sessionStore.setSession.mockResolvedValue(freshSession({ currentPath: "path2" }));
      answerProcurementQuestion.mockResolvedValue("Some answer.");
      const sendFn = jest.fn().mockResolvedValue();

      await processIncomingMessage("whatsapp", "263700000005", "What documents do I need?", sendFn);

      expect(airtable.createFoundingSupplierRecord).not.toHaveBeenCalled();
      expect(airtable.deleteFoundingSupplierRecordByContact).not.toHaveBeenCalled();
    });
  });
});
