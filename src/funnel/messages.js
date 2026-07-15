/**
 * All message copy lives here, mirroring docs/WHATSAPP_FUNNEL.md exactly.
 * If you change wording, update WHATSAPP_FUNNEL.md in the same commit —
 * see CONTRIBUTING.md.
 */

const messages = {
  welcome: `👋 Welcome to Tender Reach

We help Zimbabwean businesses discover, understand, and prepare for public procurement opportunities.

Our goal is simple: make tender participation easier, clearer, and more successful.

To get started, choose an option below:

1️⃣ Join Founding Supplier Programme (Interview + Early Access)
2️⃣ Ask a Procurement Question
3️⃣ Learn What Tender Reach Does
4️⃣ Speak to Our Team`,

  invalidMenuChoice: `Sorry, I didn't catch that 🙏 Please reply with a number: 1, 2, 3, or 4. Or type "menu" anytime to see the options again.`,

  path1: {
    intro: `Great choice 🚀

We're inviting a small group of suppliers to help shape Tender Reach. This takes about 8–10 minutes and helps us understand your procurement experience.

A quick note before we start: your answers are saved and used only to guide what we build. We never sell or share them outside the team. You can stop at any time by replying "stop" — anything you've already shared stays covered by this same promise.

Let's begin.`,

    questions: [
      "Q1. What is your name and your company name?",
      "Q2. What products or services does your company provide?",
      "Q3. Have you ever supplied government before? (Yes / No / Occasionally)",
      "Q4. How do you usually find tenders?",
      "Q5. What is the hardest part of applying for tenders?",
      "Q6. Have you ever missed a tender deadline? What happened?",
      "Q7. If Tender Reach could solve ONE problem for you, what should it be?",
    ],

    stoppedEarly: `No problem — thanks for sharing what you did 🙏 Nothing further will be asked. What you've already shared will still help shape Tender Reach, under the same terms as before. You can return to the full interview anytime by replying "START".`,

    complete: `🙏 Thank you for sharing your experience.

We've saved your responses and they will directly shape what we build. Based on your answers, we'll soon share early access tools designed for your needs.

You are now part of the Tender Reach Founding Supplier Circle ⭐`,
  },

  path2: {
    prompt: `Ask us anything about public procurement.

Example:
• "How do I apply for a tender?"
• "What documents do I need?"
• "How do I register as a supplier?"`,

    placeholder: `Thanks for your question! 🙏 Our full answering system is still being built. For now, please type your question and a real person from our team will get back to you within 24 hours.`,

    closingPrompt: `Would you like us to also guide you step-by-step through tenders in the Founding Supplier Programme?

1️⃣ Yes
2️⃣ Not now`,
  },

  path3: {
    info: `Tender Reach is building digital tools that help businesses navigate public procurement more easily.

We focus on:
• Tender discovery
• Document guidance
• Supplier support
• AI-powered assistance

Our mission is to make procurement clear, fair, and accessible for all businesses in Zimbabwe 🇿🇼`,

    cta: `Would you like to join our Founding Supplier Programme?

1️⃣ Yes
2️⃣ Maybe later`,
  },

  path4: {
    message: `A member of the Tender Reach team will respond to you shortly.

In the meantime, you can also join our Founding Supplier Programme for faster support and early access tools.`,
  },

  dataDeletionConfirmed: `Done — your data has been deleted from our systems. If you'd like to start again anytime, just reply "START".`,

  unsupportedMessageType: `Thanks for sending that 🙏 Right now I can only read text messages. Please type your response, or reply "menu" to see the options again.`,

  rateLimited: `You've sent quite a few messages in a short time 🙏 Please wait a few minutes before sending another — this helps us keep things running smoothly for everyone.`,
};

module.exports = messages;
