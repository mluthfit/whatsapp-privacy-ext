# Privacy for WhatsApp Web

A local-only Chrome extension that visually blurs sensitive content on WhatsApp Web. Protected content is revealed temporarily on hover without modifying messages, contacts, or attachments.

## Features

- Privacy-first defaults with Master Privacy, both section gates, and every category enabled.
- Independent List Views and Conversation gates that pause a section without changing its child settings.
- Keyboard panic shortcut for toggling Master Privacy without opening the popup.
- Green ON and gray OFF logos in the Chrome toolbar and popup.
- Automatic protection at `document_start`, including content rendered dynamically by WhatsApp Web.
- Live setting updates across every open WhatsApp Web tab.
- Per-element hover reveal that restores blur as soon as the pointer leaves.
- Recovery injection for tabs opened before the extension, with a reload fallback when injection fails.
- Local-only operation with no backend, analytics, telemetry, or remote resources.

### List Views

The header toggle pauses or restores all List Views blur while retaining the four settings below it.

- **Name** protects contact names, group names, community labels, Status contact names, people listed in New Chat or New Group, and the complete self-row identity including `(You)`.
- **Avatar** protects contact, group, community, and Status identity images, including people and the self row in New Chat or New Group.
- **Time & Unread Count** protects both fields with one setting. Hovering either field reveals both for that row.
- **Message Preview** protects the complete preview line, including sender prefixes, attachment or call icons, preview text, contact status/about text, and the `Message yourself` self-row status.

Community rows reveal the community and subgroup names together when either name is hovered. Other fields in the row remain independently protected.

New Chat and New Group keep drawer titles, search fields, action rows, and alphabetical headings visible.

### Communities

- Community and subgroup names follow **Name**.
- Community and subgroup identity images follow **Avatar**.
- Subgroup timestamps and unread badges follow **Time & Unread Count**.
- Subgroup previews and joinable-group descriptions follow **Message Preview**.
- Community card headers, subgroup rows, and the View All header reveal independently.
- New community, View All, Add group, Back, menu, and section-heading controls remain visible.

### Status list

- Status contact names follow **Name**.
- Status thumbnails and the My Status profile image follow **Avatar**.
- Status timestamps follow **Time & Unread Count**.
- New-status rings remain visible as navigation indicators.

Status viewer content is not included in this release.

### Conversation

The header toggle pauses or restores all Conversation blur while retaining the six settings below it.

- **Name** protects the active conversation header name, its participant subtitle, and group-message sender labels.
- **Avatar** protects the active conversation header avatar and each sender avatar in group conversations.
- **Time** protects incoming and outgoing message timestamps.
- **Messages & Calls** protects message text, emoji, expanded `Read more` content, contextual search text such as `Get more info about this message. Search on web`, link text, quotes, captions, and call cards.
- **Media & Attachments** protects images, videos, stickers, audio interfaces, documents, link thumbnails, and location thumbnails inside the conversation.
- **Text Input** protects non-empty composer text. The empty placeholder and composer controls remain visible.

Delivery or read indicators and edited labels remain visible. Media opened in WhatsApp's fullscreen viewer is intentionally not blurred.

### Keyboard panic shortcut

Press `Ctrl+Shift+P` on Windows, Linux, or ChromeOS, or `Command+Shift+P` on macOS, to toggle Master Privacy from any tab while Chrome is active. Section gates and child settings are retained. The toolbar and popup logos turn green when Master Privacy is on and gray when it is off.

Chrome may leave a suggested shortcut unassigned when it conflicts with another command. The popup displays the active binding; select **SET NOW** or **CHANGE** in its footer to open Chrome's shortcut settings without typing `chrome://extensions/shortcuts` manually.

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
- `src/background.ts` handles the keyboard command and keeps the toolbar icon synchronized.
- `src/popup.ts` manages settings, health checks, recovery injection, and reload fallback.
- `public/privacy.css` contains the centralized WhatsApp DOM selectors and blur behavior.
- `public/popup.html` and `public/popup.css` define the popup interface.

## Privacy model

- Only thirteen boolean values are stored: Master Privacy, two section gates, four List Views categories, and six Conversation categories.
- The extension has no backend, analytics, telemetry, or external network requests.
- WhatsApp names, messages, attachments, call details, and composer text are never stored or transmitted by the extension.
- Blur is visual only. The underlying WhatsApp content remains available to WhatsApp, browser developer tools, accessibility tools, and other software with page access.

This extension provides visual privacy, not encryption, redaction, access control, or protection from software that can inspect the page.

## Selector maintenance

Selectors are centralized in `public/privacy.css` and prefer semantic `data-testid`, role, and structural attributes found in the reference captures under `docs/layout/`. Generated WhatsApp class names are intentionally not used.

The reference captures are development inputs and are never copied into `dist/`. They may contain private WhatsApp data and must be sanitized before they are committed, shared, or published.
