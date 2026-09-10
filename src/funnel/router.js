const messages = require("./messages");

/**
 * Pure routing function. Same logic as before, plus: every Founding
 * Supplier interview question now shows a "Question X of 7" progress
 * line, so users know how much is left — a real, low-risk improvement
 * that needed no change to core.js, deliberately, given how easy it's
 * proven to be for the two deployment copies of these files (this one
 * and src/funnel/router.js) to drift out of sync.
 *
 * REMINDER: this exact file also lives at src/funnel/router.js for
 * local dev/testing, and must be updated there too, by hand, every
 * time. That mismatch already caused one real bug (WhatsApp Path 2
 * silently never reaching the AI) — check both copies whenever you
 * touch this logic.
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

/** e.g. "Question 3 of 7\n" + the actual question text */
function withProgress(stepNumber, questionText) {
  const total = messages.path1.questions.length;
  return `Question ${stepNumber} of ${total}\n${questionText}`;
}

function routeTopLevelMenu(text) {
  switch (text) {
    case "1":
      return {
        reply: messages.path1.intro + "\n\n" + withProgress(1, messages.path1.questions[0]),
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
    const nextStep = currentStep + 1;
    return {
      reply: withProgress(nextStep, messages.path1.questions[currentStep]),
      sessionUpdates: { interviewStep: nextStep, interviewAnswers: updatedAnswers },
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
        reply: messages.path1.intro + "\n\n" + withProgress(1, messages.path1.questions[0]),
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
      reply: messages.path1.intro + "\n\n" + withProgress(1, messages.path1.questions[0]),
      sessionUpdates: { currentPath: "path1", interviewStep: 1, internalTag: "Warm Lead" },
    };
  }
  return { reply: messages.welcome, sessionUpdates: { currentPath: null } };
}

module.exports = { route };
