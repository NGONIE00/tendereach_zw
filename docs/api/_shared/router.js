const messages = require("./messages");

/**
 * Pure routing function: given the user's current session and their
 * incoming message text, decide what to reply and how the session
 * should change.
 *
 * THIS COPY LIVES IN docs/api/_shared/ for the live Vercel serverless
 * deployment — it must be kept in sync with src/funnel/router.js by
 * hand (two separate deployments, can't share the file directly).
 *
 * routePath2's question branch signals `__needsAiAnswer` with the
 * question text (reply: null) instead of returning a canned reply —
 * docs/api/_shared/core.js checks this signal and calls Gemini.
 *
 * @param {object} session
 * @param {string} rawText
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
