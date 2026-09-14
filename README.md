# Privacy for WhatsApp Web

A local-only Chrome extension that visually blurs sensitive content on WhatsApp Web. Protected content is revealed temporarily on hover without modifying messages, contacts, or attachments.

## Features

- Privacy-first defaults with Master Privacy and every category enabled.
- Automatic protection at `document_start`, including content rendered dynamically by WhatsApp Web.
- Live setting updates across every open WhatsApp Web tab.
- Per-element hover reveal that restores blur as soon as the pointer leaves.
- Recovery injection for tabs opened before the extension, with a reload fallback when injection fails.
- Local-only operation with no backend, analytics, telemetry, or remote resources.

### Chat list

- **Name** protects contact names, group names, community labels, conversation header names, and group-message sender labels.
- **Avatar** protects contact, group, community, and conversation-header images.
- **Time & Unread Count** protects both fields with one setting. Hovering either field reveals both for that row.
- **Message Preview** protects the complete preview line, including sender prefixes, attachment or call icons, and preview text.

Community rows reveal the community and subgroup names together when either name is hovered. Other fields in the row remain independently protected.

### Status list

- Status contact names follow **Name**.
- Status thumbnails and the My Status profile image follow **Avatar**.
- Status timestamps follow **Time & Unread Count**.
- New-status rings remain visible as navigation indicators.

Status viewer content is not included in this release.

### Conversation

- **Messages & Calls** protects message text, emoji, expanded `Read more` content, contextual search text such as `Get more info about this message. Search on web`, link text, quotes, captions, and call cards.
- **Media & Attachments** protects images, videos, stickers, audio interfaces, documents, link thumbnails, and location thumbnails inside the conversation.
- **Text Input** protects non-empty composer text. The empty placeholder and composer controls remain visible.

Standalone message timestamps and delivery or read indicators remain visible. Media opened in WhatsApp's fullscreen viewer is intentionally not blurred.

## Build and install

1. Run `npm install`.
2. Run `npm run build`.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Choose **Load unpacked** and select the generated `dist/` directory.

After changing the source, run `npm run build`, click **Reload** for the extension on `chrome://extensions`, and reload existing WhatsApp Web tabs.

## Development

- `npm run build` compiles TypeScript, copies static assets, and generates extension icons in `dist/`.
- `npm test` creates a clean build and runs settings, migration, content-runtime, manifest, selector, popup, and network-surface checks.
- `dist/` is the complete unpacked extension and is not committed.

The source is organized as follows:

- `src/settings.ts` defines defaults, validation, migration, and persistence.
- `src/content.ts` applies root privacy state and listens for storage changes.
- `src/popup.ts` manages settings, health checks, recovery injection, and reload fallback.
- `public/privacy.css` contains the centralized WhatsApp DOM selectors and blur behavior.
- `public/popup.html` and `public/popup.css` define the popup interface.

## Privacy model

- Only eight boolean values are stored: Master Privacy, four Chat List categories, and three Conversation categories.
- The extension has no backend, analytics, telemetry, or external network requests.
- WhatsApp names, messages, attachments, call details, and composer text are never stored or transmitted by the extension.
- Blur is visual only. The underlying WhatsApp content remains available to WhatsApp, browser developer tools, accessibility tools, and other software with page access.

This extension provides visual privacy, not encryption, redaction, access control, or protection from software that can inspect the page.

## Selector maintenance

Selectors are centralized in `public/privacy.css` and prefer semantic `data-testid`, role, and structural attributes found in the reference captures under `docs/layout/`. Generated WhatsApp class names are intentionally not used.

The reference captures are development inputs and are never copied into `dist/`. They may contain private WhatsApp data and must be sanitized before they are committed, shared, or published.
