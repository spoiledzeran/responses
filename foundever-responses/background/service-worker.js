// Foundever Responses - Service Worker
// Seeds the default response templates on install.

// Default templates that come pre-loaded with the extension.
// Shortcuts are stored bare (no dot); the "." activator prefix is
// prepended at match time. User data is never overwritten.
const DEFAULT_SNIPPETS = [
  {
    id: '1788748104788',
    title: 'ENG_Chat_DPA',
    shortcut: 'chatdpa',
    category: 'general',
    content: "I'd love to help by looking at your case, but since we're discussing case details that may contain sensitive data, I'm gonna have to ask you to fill out this secure form with your name, email and order number. This is to keep your data safe and to ensure compliance with the General Data Protection Regulations.\n\nA form will open up shortly, thank you in advance."
  },
  {
    id: '1788748217169',
    title: 'ENG_Chat_Open',
    shortcut: 'chatopen',
    category: 'greeting',
    content: "Good afternoon! I hope you've had a lovely day and thank you for contacting UNIQLO! \nMy name is Malthe and I'll be here to assist you with any queries, questions or worries you may have!\n\nHow may I help you?"
  },
  {
    id: '1788748424184',
    title: 'ENG_Chat_Bump_1',
    shortcut: 'chatbump1',
    category: 'troubleshooting',
    content: 'Thank you very much for your patience, please allow me a few more minutes to investigate and develop a firm understanding of the root of the issue.'
  },
  {
    id: '1788748512451',
    title: 'ENG_Chat_Bump_2',
    shortcut: 'chatbump2',
    category: 'troubleshooting',
    content: 'Please allow me just a few more minutes, there are a few more things I need to confirm. Thank you for your patience.'
  },
  {
    id: '1788748881851',
    title: 'Chat_Survey_Promo',
    shortcut: 'survey',
    category: 'closing',
    content: "I'd like to thank you for contacting UNIQLO support, it was absolutely lovely chatting with you. \n\nOnce this chat ends, you will have the option to rate the level of service that I've offered you today. A rating of 5 means you're very satisfied, a rating of 1 means you're strongly dissatisfied with my service. Please feel free to fill out this survey if you have 30-60 seconds, it will also allow you to share additional feedback.\nPlease note that you are rating your personal experience with me, and you are not rating the company or its policies."
  }
];

chrome.runtime.onInstalled.addListener(async (details) => {
  const { snippets } = await chrome.storage.local.get('snippets');
  // Never clobber user data — seed defaults only when there are no snippets yet.
  if (snippets && snippets.length > 0) return;
  await chrome.storage.local.set({ snippets: DEFAULT_SNIPPETS });
});