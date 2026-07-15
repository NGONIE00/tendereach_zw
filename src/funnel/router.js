const messages = require("./messages");

/**
 * Pure routing function: given the user's current session and their
 * incoming message text, decide what to reply and how the session should
 * change. Deliberately has no side effects (no network calls, no db writes)
 * so it can be unit tested directly — see src/whatsapp/router.test.js.
 *
 * @param {object} session - current session object from sessionStore
 * @param {string} rawText - the incoming message text from the user
 * @returns {{ reply: string, sessionUpdates: object }}
 */
function route(session, rawText) {
  const text = (rawText || "").trim().toLowerCase();

  // Global commands — work no matter where the user is in the funnel.
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

  // Mid-interview stop/skip.
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

  // No path chosen yet — expect a top-level menu selection.
  if (!session.currentPath) {
    return routeTopLevelMenu(text);
  }

  // Already inside a path — route based on which one.
  switch (session.currentPath) {
    case "path1":
      return routePath1(session, text, rawText);
    case "path2":
      return routePath2(session, text);
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
  const currentStep = session.interviewStep; // 1-indexed question just asked

  if (currentStep < 1 || currentStep > totalQuestions) {
    // Shouldn't normally happen, but fail safe back to menu.
    return { reply: messages.welcome, sessionUpdates: { currentPath: null, interviewStep: 0 } };
  }

  // Store the answer to the question that was just asked.
  const updatedAnswers = [...session.interviewAnswers];
  updatedAnswers[currentStep - 1] = rawText;

  if (currentStep < totalQuestions) {
    // Ask the next question.
    return {
      reply: messages.path1.questions[currentStep], // currentStep is next index (0-indexed)
      sessionUpdates: { interviewStep: currentStep + 1, interviewAnswers: updatedAnswers },
    };
  }

  // That was the last question — interview complete.
  return {
    reply: messages.path1.complete,
    sessionUpdates: {
      currentPath: null,
      interviewStep: 0,
      interviewAnswers: updatedAnswers,
      internalTag: "Pilot User",
      __interviewCompleted: true, // signals webhook.js to persist to CRM
    },
  };
}

function routePath2(session, text) {
  // First message after choosing path2 is their question — respond with
  // the placeholder (per docs/WHATSAPP_FUNNEL.md, no AI pipeline live yet),
  // then offer the closing prompt.
  if (text === "1" || text === "2") {
    // They're replying to the closing prompt (Yes / Not now).
    if (text === "1") {
      return {
        reply: messages.path1.intro + "\n\n" + messages.path1.questions[0],
        sessionUpdates: { currentPath: "path1", interviewStep: 1, internalTag: "Warm Lead" },
      };
    }
    return { reply: messages.welcome, sessionUpdates: { currentPath: null } };
  }

  return {
    reply: messages.path2.placeholder + "\n\n" + messages.path2.closingPrompt,
    sessionUpdates: { internalTag: "Active User" },
  };
}

function routePath3(session, text) {
  if (text === "1") {
    return {
      reply: messages.path1.intro + "\n\n" + messages.path1.questions[0],
      sessionUpdates: { currentPath: "path1", interviewStep: 1, internalTag: "Warm Lead" },
    };
  }
  // "2" (Maybe later) or anything else — return to menu, no further tag change.
  return { reply: messages.welcome, sessionUpdates: { currentPath: null } };
}

module.exports = { route };
