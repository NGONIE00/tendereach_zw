const messages = require("./messages");

/**
 * Pure routing function. No side effects — async work (Gemini,
 * Airtable) is signalled via sessionUpdates flags, handled in core.js.
 *
 * Keep in sync BY HAND across:
 *   src/funnel/router.js        (local dev / npm test)
 *   docs/api/_shared/router.js  (live Vercel serverless deployment)
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
      reply: messages.path2.closingAcknowledged,
      sessionUpdates: { awaitingClosingReply: false },
    };
  }

  // BUGFIX (infinite "2" loop): a bare number or very short scrap of
  // text is almost never a real procurement question — it's usually a
  // menu number typed out of habit, or a stray keystroke. Previously
  // these went straight to Gemini, which replied with a generic "looks
  // like you sent a number" greeting, then the closing prompt was
  // appended, so replying "2" again repeated the exact same cycle
  // forever. Now we ask for a real question instead of burning an AI
  // call and looping.
  const isBareNumber = /^\d+$/.test(text);
  const isTooShort = text.replace(/[^a-z0-9]/gi, "").length < 4;

  if (isBareNumber || isTooShort) {
    return {
      reply: messages.path2.needsRealQuestion,
      sessionUpdates: {},
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
