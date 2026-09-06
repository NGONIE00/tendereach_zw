const messages = require("./messages");

/**
 * Pure routing function: given the user's current session and their
 * incoming message text, decide what to reply and how the session
 * should change. Deliberately has no side effects (no network calls,
 * no db writes) so it can be unit tested directly.
 *
 * CHANGE: routePath2's question branch no longer returns the static
 * placeholder as `reply` — it signals `__needsAiAnswer` with the
 * question text instead, and returns `reply: null`. The actual Gemini
 * call (async, real I/O) happens in src/funnel/core.js, which checks
 * this signal the same way it already checks `__interviewCompleted`
 * for Airtable writes — keeping this file pure.
 *
 * @param {object} session - current session object from sessionStore
 * @param {string} rawText - the incoming message text from the user
 * @returns {{ reply: string|null, sessionUpdates: object }}
 */
function route(session, rawText) {
  const text = (rawText || "").trim().toLowerCase();

  if (text === "delete my data" || text === "delete") {
    return {
      reply: messages.dataDeletionConfirmed,
      sessionUpdates: { __deleteSession: true },
    };
  }

  if (text === "menu" || text === "start") {
    return {
      reply: messages.welcome,
      sessionUpdates: { currentPath: null, interviewStep: 0, interviewAnswers: [] },
    };
  }

  if (
    session.currentPath === "path1" &&
    session.interviewStep > 0 &&
    session.interviewStep <= messages.path1.questions.length &&
    (text === "stop" || text === "skip")
  ) {
    return {
      reply: messages.path1.stoppedEarly,
      sessionUpdates: { currentPath: null, interviewStep: 0 },
    };
  }

  if (!session.currentPath) {
    return routeTopLevelMenu(text);
  }

  switch (session.currentPath) {
    case "path1":
      return routePath1(session, text, rawText);
    case "path2":
      return routePath2(session, text, rawText);
    case "path3":
      return routePath3(session, text);
    case "path4":
      return { reply: messages.invalidMenuChoice, sessionUpdates: {} };
    default:
      return { reply: messages.welcome, sessionUpdates: { currentPath: null } };
  }
}

function routeTopLevelMenu(text) {
  switch (text) {
    case "1":
      return {
        reply: messages.path1.intro + "\n\n" + messages.path1.questions[0],
        sessionUpdates: { currentPath: "path1", interviewStep: 1, internalTag: "Founding Lead" },
      };
    case "2":
      return {
        reply: messages.path2.prompt,
        sessionUpdates: { currentPath: "path2", internalTag: "Active User" },
      };
    case "3":
      return {
        reply: messages.path3.info + "\n\n" + messages.path3.cta,
        sessionUpdates: { currentPath: "path3" },
      };
    case "4":
      return {
        reply: messages.path4.message,
        sessionUpdates: { currentPath: "path4" },
      };
    default:
      return { reply: messages.invalidMenuChoice, sessionUpdates: {} };
  }
}

function routePath1(session, text, rawText) {
  const totalQuestions = messages.path1.questions.length;
  const currentStep = session.interviewStep;

  if (currentStep < 1 || currentStep > totalQuestions) {
    return { reply: messages.welcome, sessionUpdates: { currentPath: null, interviewStep: 0 } };
  }

  const updatedAnswers = [...session.interviewAnswers];
  updatedAnswers[currentStep - 1] = rawText;

  if (currentStep < totalQuestions) {
    return {
      reply: messages.path1.questions[currentStep],
      sessionUpdates: { interviewStep: currentStep + 1, interviewAnswers: updatedAnswers },
    };
  }

  return {
    reply: messages.path1.complete,
    sessionUpdates: {
      currentPath: null,
      interviewStep: 0,
      interviewAnswers: updatedAnswers,
      internalTag: "Pilot User",
      __interviewCompleted: true,
    },
  };
}

function routePath2(session, text, rawText) {
  // Replying "1"/"2" to the closing prompt — only reachable once
  // core.js has set session.awaitingClosingReply after delivering an
  // AI answer (see core.js).
  if (session.awaitingClosingReply && (text === "1" || text === "2")) {
    if (text === "1") {
      return {
        reply: messages.path1.intro + "\n\n" + messages.path1.questions[0],
        sessionUpdates: {
          currentPath: "path1",
          interviewStep: 1,
          internalTag: "Warm Lead",
          awaitingClosingReply: false,
        },
      };
    }
    return {
      reply: messages.welcome,
      sessionUpdates: { currentPath: null, awaitingClosingReply: false },
    };
  }

  // Any other text while in path2 is treated as the actual question —
  // signal core.js to call the AI rather than replying here directly.
  return {
    reply: null,
    sessionUpdates: { internalTag: "Active User", __needsAiAnswer: true, __aiQuestion: rawText },
  };
}

function routePath3(session, text) {
  if (text === "1") {
    return {
      reply: messages.path1.intro + "\n\n" + messages.path1.questions[0],
      sessionUpdates: { currentPath: "path1", interviewStep: 1, internalTag: "Warm Lead" },
    };
  }
  return { reply: messages.welcome, sessionUpdates: { currentPath: null } };
}

module.exports = { route };
