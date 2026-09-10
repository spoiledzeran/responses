# Foundever Responses

A Chrome extension for customer service agents to insert prewritten, formatted canned responses using keyboard shortcuts. Built for the Foundever pitch.

## Features

- **Quick Insertion**: Type `.ty`, `.hi`, or any custom trigger in any text field to expand it into a full, prewritten response.
- **One Trigger Field**: Each snippet has a single shortcut — letters and numbers only. Type `.` + shortcut (e.g. `.hello`) to trigger it.
- **Works Everywhere**: Gmail, Salesforce, Zendesk, Genesys, Slack, or any website with a text input.
- **Snippet Management**: Popup UI to create, edit, search, and delete snippets.
- **Categories**: Organize responses by Greeting, Troubleshooting, Escalation, Closing, etc.
- **Export / Import**: Share snippets as `.json` files — manual team distribution for now.
- **Privacy-First**: All data stays in your browser's local storage. Zero data collection, zero network requests.

## How It Works

1. Save a response in the popup and assign it a shortcut (e.g., `ty` — letters and numbers only).
2. Type `.ty` in any text field (email, chat, ticket).
3. The trigger auto-expands into your full formatted response.

## Installation (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `foundever-responses` folder
5. Done — pin the extension to your toolbar

## Usage

- **Add a snippet**: Click the extension icon → **+ New** → fill in title, shortcut (letters and numbers only, e.g. `ty`), and response → Save.
- **Insert a snippet**: In any text field, type `.` + shortcut (e.g. `.ty`). The `.` prefix is always implicit — you only type it, never store it.
- **Copy a snippet**: Click a snippet in the popup to copy its content.
- **Search**: Type in the search box to filter snippets.
- **Export**: Click **Export** to download all snippets as a `.json` file.
- **Import**: Click **Import** and select a `.json` file to add snippets (duplicate prefix+shortcut pairs are skipped).

## Starting Fresh

The extension ships with 5 default ENG templates (`.chatdpa`, `.chatopen`, `.chatbump1`, `.chatbump2`, `.survey`) that are seeded the first time it runs. If you remove all snippets, a fresh install re-seeds them; any snippets you create are never overwritten.

## Project Structure

```
foundever-responses/
├── manifest.json            # Extension config (MV3, minimal permissions)
├── popup/
│   ├── popup.html           # Snippet management UI
│   ├── popup.css            # Styling
│   └── popup.js             # CRUD + export/import logic
├── content/
│   └── content.js           # Keyboard shortcut detection & expansion
├── background/
│   └── service-worker.js    # Seeds 5 default templates on install
└── icons/                   # 16, 48, 128 px
```

## Permissions

Only what's necessary:
- `storage` — save snippets locally
- `activeTab` — interact with the current page

No host permissions. No analytics. No telemetry.

## Roadmap / Pitch Ideas

- **Dynamic variables** (`{name}`, `{order#}`) for personalization
- **Team sharing** via sync or a shared backend
- **Usage analytics** — show time saved per agent
- **Integration** with Foundever's contact-center platforms

---

Built as a lightweight, pitch-ready prototype.
