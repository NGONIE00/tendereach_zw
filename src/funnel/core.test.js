jest.mock("../db/sessionStore");
jest.mock("../db/airtable");

const sessionStore = require("../db/sessionStore");
const airtable = require("../db/airtable");
const { processIncomingMessage } = require("./core");
const messages = require("./messages");
const { resetAll } = require("./rateLimiter");

function freshSession(overrides = {}) {
  return {
    currentPath: null,
    interviewStep: 0,
    interviewAnswers: [],
    internalTag: "Cold Lead",
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
    expect(sessionStore.setSession).toHaveBeenCalledWith(
      "whatsapp:263700000001",
      expect.objectContaining({ currentPath: "path2" })
    );
  });

  test("uses a channel-namespaced session key so platforms don't collide", async () => {
    sessionStore.getSession.mockResolvedValue(freshSession());
    sessionStore.setSession.mockResolvedValue(freshSession());
    const sendFn = jest.fn().mockResolvedValue();

    await processIncomingMessage("messenger", "1002003000", "3", sendFn);

    expect(sessionStore.getSession).toHaveBeenCalledWith("messenger:1002003000");
  });

  test("on interview completion, persists to Airtable with channel and external ID", async () => {
    const completedSession = freshSession({
      currentPath: null,
      interviewStep: 0,
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

  test("a failed Airtable write during completion does not block the user's reply", async () => {
    sessionStore.getSession.mockResolvedValue(
      freshSession({ currentPath: "path1", interviewStep: 7 })
    );
    sessionStore.setSession.mockResolvedValue(freshSession());
    airtable.createFoundingSupplierRecord.mockRejectedValue(new Error("Airtable is down"));
    const sendFn = jest.fn().mockResolvedValue();

    await processIncomingMessage("whatsapp", "263700000002", "final answer", sendFn);

    expect(sendFn).toHaveBeenCalledWith("263700000002", messages.path1.complete);
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
});
