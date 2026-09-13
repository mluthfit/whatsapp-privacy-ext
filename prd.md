# WhatsApp Web Privacy Extension Product Requirements Document

| Field | Value |
| --- | --- |
| Product | WhatsApp Web Privacy Extension |
| Document status | Draft |
| Target platform | Google Chrome desktop |
| Extension platform | Chrome Extension Manifest V3 |
| Delivery deadline | TBD |
| UI language | English |
| Reference images | `docs/homepage.png`, `docs/chat.png` |

## 1. Executive Summary

### Problem Statement

WhatsApp Web can expose personal identities, message content, attachments, and call activity to nearby people or screen-sharing participants. Users need a quick way to reduce this visual exposure without modifying their WhatsApp data or disrupting normal navigation.

### Proposed Solution

Build a Chrome extension that visually blurs configurable categories of sensitive content across WhatsApp Web. When Master Privacy is enabled, the extension automatically applies the saved configuration as WhatsApp Web loads, reveals each protected element on hover, and provides a popup-based reload fallback when the extension cannot attach to an already-open tab.

### Success Criteria

- SC-1: All supported elements in the MVP test matrix are blurred when their category and Master Privacy are enabled, with no category affecting an element assigned exclusively to another category.
- SC-2: In 100 consecutive test navigations where the extension and Master Privacy are already enabled, WhatsApp Web applies the saved privacy configuration without opening the popup or manually reloading the page.
- SC-3: Newly rendered supported elements receive their configured blur no later than 100 ms after entering the document, with a target of styling them before their first visible paint.
- SC-4: Popup configuration changes reach every open WhatsApp Web tab within 500 ms and persist across page reloads, new tabs, browser restarts, and WhatsApp logout/login cycles.
- SC-5: A network audit confirms that the extension makes no external requests and never transmits or stores WhatsApp identities, message content, attachments, call data, or typed text.

## 2. User Experience & Functionality

### User Personas

| Persona | Context | Need |
| --- | --- | --- |
| Public-space user | Uses WhatsApp Web in an office, coworking space, classroom, cafe, or other shared environment | Prevent nearby people from casually reading personal information |
| Screen-sharing user | Shares a browser window during meetings, presentations, support sessions, or recordings | Keep WhatsApp content visually private if the tab or window becomes visible |
| Privacy-conscious user | Keeps WhatsApp Web open throughout the day | Apply consistent privacy settings automatically without repeated interaction |

### Product Definitions

- **Extension enabled** means the extension is installed and enabled in Chrome.
- **Master Privacy enabled** means the extension must apply all category toggles currently set to enabled.
- **Protected element** means a WhatsApp Web element covered by an enabled blur category.
- **Reveal on hover** means only the protected element under the pointer becomes visually clear; its neighboring protected elements remain blurred.
- **Visual privacy** means the extension changes only presentation. It does not remove, replace, encrypt, redact, or otherwise modify WhatsApp data.

### Default Configuration

The first-run experience is privacy-first. Master Privacy and every category toggle default to enabled.

| Section | Setting | Default |
| --- | --- | --- |
| Global | Master Privacy | On |
| Chat List | Name | On |
| Chat List | Avatar | On |
| Chat List | Time & Unread Count | On |
| Chat List | Message Preview | On |
| Conversation | Messages & Calls | On |
| Conversation | Media & Attachments | On |
| Conversation | Text Input | On |

### Category Scope

#### Chat List

| Category | Included content | Applicable surfaces |
| --- | --- | --- |
| Name | Individual names, group names, group participant names, and equivalent identity labels | Main chat list, search results, archived chats, contact picker, active conversation header, and group message sender labels |
| Avatar | Profile photos, group photos, and generated initial avatars | Main chat list, search results, archived chats, contact picker, and active conversation header |
| Time & Unread Count | The last-activity time or date and numeric unread-message badge shown for a chat-list item | Main chat list, search results, archived chats, and contact picker wherever either field exists |
| Message Preview | Last-message text, typing indicators, draft labels and content, attachment summaries, and call summaries | Main chat list, search results, and archived chats wherever a preview exists |

Conversation header names and avatars inherit the `Name` and `Avatar` settings from Chat List. They must not introduce duplicate conversation settings.

#### Conversation

| Category | Included content | Exclusions |
| --- | --- | --- |
| Messages & Calls | Incoming and outgoing message text, emoji, expanded message text, contextual search links, captions, quoted-message text, textual link-preview details, complete voice-call cards, complete video-call cards, call direction, call status, call duration, and call details | Standalone message timestamps and delivery/read check marks |
| Media & Attachments | Images, videos, GIFs, stickers, voice notes, audio players, waveforms, audio durations, audio transcriptions, documents, filenames, file types, file sizes, document thumbnails, link thumbnails, and location thumbnails | Visual media after it has been opened in WhatsApp's fullscreen viewer |
| Text Input | User-entered text currently present in the conversation composer | Empty-input placeholder text and composer action icons |

Call summaries rendered as chat-list previews follow `Message Preview`. Call cards rendered inside an active conversation follow `Messages & Calls`.

### Core User Flow

1. The user installs the extension.
2. The extension stores the first-run defaults with Master Privacy and all categories enabled.
3. The user opens `https://web.whatsapp.com/`.
4. The extension content script runs at document start and reads the saved configuration.
5. WhatsApp Web displays its loading state and progressively renders the chat list.
6. Supported elements are automatically blurred as they appear; the user does not need to open the popup.
7. The user hovers an individual blurred element to reveal it temporarily.
8. The element becomes blurred again when it is no longer hovered.
9. The user may open the popup at any time to change Master Privacy or category settings.

### Popup States

#### Normal Configuration View

The normal popup contains one Master Privacy toggle and the seven category toggles defined in this document. Reveal on hover is mandatory behavior and must not have a setting.

```text
Master Privacy                         ON

CHAT LIST
Name                                   ON
Avatar                                 ON
Time & Unread Count                    ON
Message Preview                        ON

CONVERSATION
Messages & Calls                       ON
Media & Attachments                    ON
Text Input                             ON
```

#### Reload Fallback View

When the current tab is WhatsApp Web, the popup must first check whether a working content script is available. It may attempt programmatic injection. If the content script remains unavailable or injection fails, the popup replaces the normal configuration view with a reload fallback.

```text
Privacy is not active

The extension could not be applied to the
currently open WhatsApp Web tab.

[ Reload WhatsApp Web ]
```

The button reloads only the active WhatsApp Web tab, changes to a disabled `Reloading...` state after activation, and preserves all saved settings. The content script must apply the configuration automatically during the reload; the user must not need to reopen the popup.

If the active tab is not WhatsApp Web, the reload fallback must not be shown.

### User Stories and Acceptance Criteria

#### US-1: Automatic Protection on Page Load

As a privacy-conscious user, I want my saved blur settings applied whenever I open WhatsApp Web so that I am protected without opening the extension popup.

- AC-1.1: With the extension and Master Privacy enabled before navigation, opening WhatsApp Web applies the saved category configuration automatically.
- AC-1.2: The behavior works when WhatsApp shows a loading screen before rendering the chat list.
- AC-1.3: The behavior works after page reload, browser restart, opening an additional WhatsApp Web tab, and logout/login.
- AC-1.4: No popup interaction is required during any successful automatic startup.
- AC-1.5: If Master Privacy is disabled, no extension blur is visible after initialization.

#### US-2: Independent Chat-List Controls

As a user, I want to blur each type of chat-list information independently so that I can choose the level of visual privacy I need.

- AC-2.1: `Name`, `Avatar`, `Time & Unread Count`, and `Message Preview` each have an independent toggle.
- AC-2.2: Hovering either the time/date or unread badge reveals both fields for that chat row while neighboring rows remain protected.
- AC-2.3: Changing one category does not alter the stored values of the other categories.
- AC-2.4: Each setting applies consistently to the main chat list, search results, archived chats, and contact picker wherever the corresponding field exists.
- AC-2.5: Name and avatar settings also apply to the active conversation header.
- AC-2.6: Name settings also apply to sender labels in group conversations.

#### US-3: Independent Conversation Controls

As a user, I want separate controls for messages and calls, media and attachments, and typed input so that I can protect different conversation content independently.

- AC-3.1: `Messages & Calls` blurs all content assigned to that category, including complete call cards.
- AC-3.2: `Media & Attachments` blurs all content assigned to that category, including audio interfaces and document metadata.
- AC-3.3: `Text Input` blurs only user-entered composer content and does not blur an empty placeholder or composer action icons.
- AC-3.4: Standalone message timestamps and delivery/read check marks remain visible.
- AC-3.5: Opening visual media in WhatsApp's fullscreen viewer displays the fullscreen media without extension blur.
- AC-3.6: Emoji, contextual search links, and content revealed after expanding a long message follow `Messages & Calls` without requiring a DOM rescan.

#### US-4: Reveal on Hover

As a user, I want to reveal a protected item temporarily by hovering it so that I can inspect content without disabling privacy globally.

- AC-4.1: Every protected element is revealed while directly hovered.
- AC-4.2: Hovering one protected element does not reveal neighboring protected elements or an entire chat card unless the card itself is the defined protected element.
- AC-4.3: The element returns to its configured blur state within one animation frame after hover ends.
- AC-4.4: Reveal on hover is always enabled and is not displayed as a popup setting.
- AC-4.5: Text Input is revealed only by hover; keyboard focus alone does not remove its blur.
- AC-4.6: Blurred interactive elements remain usable after being revealed, including chat rows, media thumbnails, audio controls, documents, and call cards.
- AC-4.7: Audio playback continues if the pointer leaves the player and its visual interface becomes blurred again.

#### US-5: Temporary Global Disable

As a user, I want to disable all privacy effects with one control so that I can use WhatsApp normally without rebuilding my category configuration later.

- AC-5.1: Disabling Master Privacy removes all extension blur from every open WhatsApp Web tab.
- AC-5.2: Disabling Master Privacy preserves every category toggle value.
- AC-5.3: Re-enabling Master Privacy reapplies the preserved configuration.
- AC-5.4: The master state persists across page reloads and browser restarts.

#### US-6: Live Configuration Updates

As a user, I want toggle changes to apply immediately so that I can see the resulting privacy state without reloading WhatsApp Web.

- AC-6.1: A setting change applies to all existing matching elements within 500 ms.
- AC-6.2: A setting change applies to every open WhatsApp Web tab.
- AC-6.3: Elements rendered after a setting change inherit the latest configuration.
- AC-6.4: Normal configuration changes never require a page reload.

#### US-7: Reload Recovery

As a user, I want a clear recovery action when the extension cannot attach to WhatsApp Web so that I can restore privacy without diagnosing an extension error.

- AC-7.1: The popup attempts to contact or inject the content script before showing the fallback.
- AC-7.2: If recovery without reload succeeds, the popup displays the normal configuration view.
- AC-7.3: If recovery fails on an active WhatsApp Web tab, the popup displays the dedicated reload fallback view.
- AC-7.4: Clicking `Reload WhatsApp Web` reloads only that tab and disables the button with a `Reloading...` label.
- AC-7.5: Saved settings remain unchanged through the recovery flow.
- AC-7.6: The fallback is never shown solely because the active tab is not WhatsApp Web.

#### US-8: Local-Only Visual Privacy

As a privacy-conscious user, I want the extension to operate locally without collecting conversation data so that adding visual privacy does not create a new data-privacy risk.

- AC-8.1: The extension has no backend, analytics endpoint, remote logging endpoint, database, or user account system.
- AC-8.2: Only extension configuration values are persisted.
- AC-8.3: WhatsApp names, avatars, message bodies, attachments, call information, and typed composer text are never persisted by the extension.
- AC-8.4: The extension makes no external network requests.
- AC-8.5: Blurring does not mutate, replace, delete, or submit WhatsApp content.

### Non-Goals

- Providing cryptographic protection, access control, end-to-end encryption, or data redaction.
- Preventing access through browser developer tools, the DOM, clipboard operations, accessibility APIs, or malicious software.
- Blurring media after it is opened in WhatsApp's fullscreen viewer.
- Hiding browser notifications, operating-system notifications, tab titles, favicons, or Chrome UI.
- Blurring the WhatsApp search query input in the MVP.
- Covering contact-info panels, group-info panels, Communities, Status, Channels, Calls navigation, or other WhatsApp surfaces not explicitly listed in the category scope.
- Supporting WhatsApp mobile, WhatsApp Desktop, Firefox, Safari, Edge, or other Chromium browsers in the MVP.
- Providing per-contact rules, allowlists, blocklists, schedules, passwords, or remote synchronization in the MVP.
- Providing a reveal-on-hover toggle or configurable hover behavior.
- Providing user-configurable blur intensity in the MVP; the release uses one fixed, implementation-validated blur value.
- Reading, interpreting, indexing, analyzing, exporting, or transmitting message content.

## 3. AI System Requirements (If Applicable)

This product does not use artificial intelligence or machine learning. No AI model is required for element classification, privacy decisions, or user interaction.

### Tool Requirements

Not applicable. The extension uses deterministic DOM targeting, CSS presentation rules, and Chrome Extension APIs.

### Evaluation Strategy

Not applicable to AI quality. Product quality is evaluated through the functional, privacy, performance, and regression criteria defined elsewhere in this document.

## 4. Technical Specifications

### Architecture Overview

The MVP is a local-only Chrome Manifest V3 extension. The current repository provides TypeScript and Chrome API type definitions; the popup UI framework and build tooling remain TBD.

```text
Popup configuration
        |
        v
chrome.storage.local <----> Content script on web.whatsapp.com
                                |
                                v
                    Root privacy state and CSS rules
                                |
                                v
                 Existing and dynamically rendered DOM
```

| Component | Responsibility |
| --- | --- |
| Manifest | Declare Manifest V3 metadata, `web.whatsapp.com` scope, permissions, popup, content scripts, and document-start execution |
| Popup | Read and update settings, show the normal configuration view, verify content-script availability, attempt recovery injection, and show the reload fallback |
| Content script | Load settings independently of the popup, apply privacy state, react to storage changes, classify dynamic WhatsApp elements when required, and respond to popup health checks |
| Privacy stylesheet | Apply category-specific blur and per-element hover reveal without changing layout or data |
| Local storage | Persist Master Privacy and category booleans only |

### Startup and Runtime Behavior

1. Chrome injects the privacy stylesheet and content script into matching WhatsApp Web documents at `document_start`.
2. The content script reads `chrome.storage.local` without waiting for the popup or a long-lived service worker.
3. If no settings exist, the content script initializes the privacy-first defaults.
4. The content script maps the settings to root-level classes or data attributes.
5. Static CSS selectors immediately cover matching elements, including elements added later.
6. A narrowly scoped `MutationObserver` may classify dynamic elements only when stable CSS selectors are insufficient.
7. A `chrome.storage.onChanged` listener updates every loaded WhatsApp Web tab when settings change.
8. Initialization and reinjection must be idempotent so duplicate styles, observers, and message listeners are not created.

### Configuration Model

The logical configuration model is:

```ts
interface PrivacySettings {
  enabled: boolean;
  chatList: {
    name: boolean;
    avatar: boolean;
    timeAndUnreadCount: boolean;
    messagePreview: boolean;
  };
  conversation: {
    messagesAndCalls: boolean;
    mediaAndAttachments: boolean;
    textInput: boolean;
  };
}
```

All values default to `true`. Settings are global to the Chrome profile and apply to every open WhatsApp Web tab; they are not configured per tab or per WhatsApp contact.

### Blur Behavior

- Blur must be implemented as a visual style and must not replace content with placeholder values.
- The fixed blur strength must make protected content unreadable at 100% browser zoom in the approved visual test fixtures. The exact CSS value is determined during implementation and recorded as a shared design token.
- Applying blur must not cause layout shift, resize chat rows, change scroll position, or block pointer interaction.
- Hover reveal must target the smallest independently controlled element that satisfies the category definition.
- When one rendered component contains fields from multiple categories, each field must follow its own toggle and hover state.
- The fullscreen media viewer must be explicitly excluded from `Media & Attachments` blur rules.

### Dynamic Content and Selector Strategy

- Prefer stable semantic attributes, roles, accessible labels, element types, and structural relationships over generated WhatsApp class names.
- Keep selectors and element-classification rules centralized so WhatsApp DOM changes can be corrected without modifying unrelated behavior.
- Use CSS alone when it can cover existing and future elements reliably.
- Use `MutationObserver` only where annotation or message-type classification is required.
- Process only added or changed subtrees rather than rescanning the entire document after each mutation.
- Ensure virtualized chat rows and message bubbles are re-evaluated when WhatsApp reuses DOM nodes for different content.

### Popup Recovery Logic

1. On a WhatsApp Web tab, the popup sends a health-check message to the content script.
2. If the content script responds, the popup displays the normal configuration view.
3. If no receiver exists, the popup attempts programmatic script and style injection.
4. If the injected content script responds, the popup displays the normal configuration view and applies saved settings.
5. If injection is rejected or the content script remains unavailable, the popup displays the reload fallback.
6. Selecting the reload action calls the Chrome tab reload API for the active WhatsApp Web tab.

This flow addresses tabs opened before extension installation, extension re-enablement, extension updates, and invalidated content-script contexts. Reload remains a fallback rather than part of normal operation.

### Integration Points

| Integration | Purpose | Data exchanged |
| --- | --- | --- |
| WhatsApp Web DOM | Locate supported visual elements and apply styles | No content is exported or persisted |
| `chrome.storage.local` | Persist global privacy settings | Booleans representing Master Privacy and category states |
| Chrome content scripts | Run startup and runtime privacy behavior | Saved configuration and internal health-check messages |
| `chrome.scripting` | Attempt recovery injection into an eligible WhatsApp Web tab | Packaged extension scripts and styles only |
| Chrome tabs API | Identify and reload the active fallback tab | Tab identifier and matching URL context |

No application API, database, authentication provider, remote configuration service, or third-party analytics integration is required.

### Permissions

The implementation must request only the minimum Chrome permissions needed for the approved behavior. Expected permissions are:

- Host access limited to `https://web.whatsapp.com/*`.
- `storage` for local configuration persistence.
- `scripting` for recovery injection.
- Any additional tab-related permission only if implementation testing proves it is required for active-tab detection or reload behavior.

Permission additions require PRD review and must include a user-facing justification.

### Security & Privacy

- All processing occurs locally in the browser.
- The extension must not include remote code.
- The extension must not send telemetry, analytics, crash payloads, or content-derived diagnostics.
- Logs included in production builds must not contain DOM text, names, URLs containing user data, message metadata, or attachment metadata.
- Only boolean configuration values may be stored for the MVP.
- The content script must not request or parse message text values when a CSS or structural selector can implement the requirement.
- The Chrome Web Store privacy disclosure must state that the extension provides visual privacy only and does not collect or transmit WhatsApp data.
- User-facing documentation must state that blurred data remains present in WhatsApp and may still be accessible through the DOM, accessibility tools, clipboard actions, or developer tools.

### Performance Requirements

- The extension must not add more than 50 ms of scripting work during initial content-script setup on the reference development machine; the reference machine specification is TBD before performance testing.
- Storage-driven configuration changes must apply within 500 ms.
- Dynamic supported elements must be protected within 100 ms of insertion, targeting protection before first paint.
- Mutation processing must avoid full-document rescans during normal chat activity.
- Scrolling the chat list or conversation must not exhibit extension-caused continuous long tasks longer than 50 ms.

### Accessibility Requirements

- Popup controls must be keyboard operable and have programmatic labels.
- Popup text and controls must meet WCAG 2.2 AA contrast requirements.
- Focus indicators must remain visible in the popup.
- The reload fallback must announce its status and disabled loading state to assistive technology.
- The extension must disclose that visual blur does not prevent assistive technologies from accessing underlying WhatsApp content.
- In WhatsApp Web, keyboard focus alone must not reveal blurred Text Input content, per the approved privacy behavior.

### Test Strategy

The MVP release requires automated tests where practical and a manual regression matrix against the current production version of WhatsApp Web.

| Test area | Required coverage |
| --- | --- |
| Settings | Defaults, every independent toggle, Master Privacy preservation, persistence, and malformed/missing stored values |
| Startup | Fresh navigation, cached navigation, slow loading, reload, browser restart, logout/login, and multiple tabs |
| Chat List | Main list, search results, archived chats, contact picker, virtualized rows, and all four controls |
| Conversation | Direct chat, group chat sender labels, message text, quotes, captions, links, call cards, media types, audio, documents, and composer input |
| Hover | Individual reveal, nested targets, re-blur, focused composer, audio playback, and interactive media/document controls |
| Fullscreen | Blurred thumbnail before opening and unblurred media inside the fullscreen viewer |
| Dynamic DOM | Incoming messages, changed previews, new unread badges, row reuse, chat switching, and attachment loading |
| Recovery | Missing content script, successful reinjection, failed injection, reload button, preserved settings, and non-WhatsApp tabs |
| Privacy | Network audit, storage audit, production log audit, and DOM mutation audit |
| Performance | Startup cost, configuration latency, dynamic-element latency, scrolling, and mutation bursts |

An MVP build passes only when every in-scope category and surface passes the approved matrix in both the enabled and disabled state. WhatsApp DOM fixtures should be sanitized and stored without real user information.

## 5. Risks & Roadmap

### Phased Rollout

#### MVP

- Chrome desktop Manifest V3 extension.
- Privacy-first defaults with Master Privacy and all seven category toggles enabled.
- Automatic document-start behavior with no routine popup or reload requirement.
- Chat List coverage for the main list, search results, archived chats, and contact picker.
- Conversation coverage for Messages & Calls, Media & Attachments, and Text Input.
- Conversation header identity controls inherited from Chat List.
- Mandatory per-element reveal on hover.
- Fullscreen media exclusion.
- Local-only settings and zero external requests.
- Popup recovery injection and reload fallback.

#### v1.1 Candidates

- Coverage for contact-info and group-info panels.
- A keyboard command for Master Privacy.
- Additional selector diagnostics that never capture WhatsApp content.
- A user-configurable blur-strength setting, subject to usability validation.
- Expanded automated visual regression fixtures.

#### v2.0 Candidates

- Per-chat allowlists or blocklists.
- Scheduled privacy mode.
- Optional local settings lock.
- Additional WhatsApp surfaces such as Communities, Status, Channels, and Calls navigation.
- Evaluation of support for other Chromium browsers and Firefox.

Future candidates are not committed scope and require separate discovery and approval.

### Technical Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| WhatsApp changes its DOM structure or semantic attributes | Some sensitive elements may stop blurring or incorrect elements may blur | Centralize selectors, maintain sanitized fixtures, run release regression checks, and issue selector-only patches quickly |
| Privacy state is applied after content becomes visible | Sensitive content may flash briefly during startup or dynamic rendering | Inject at `document_start`, preload privacy CSS, minimize storage initialization, prefer selectors that style before paint, and measure dynamic coverage latency |
| Virtualized DOM nodes are reused | A row or message may retain the wrong classification | Re-evaluate relevant attributes and content type when observed nodes change |
| Broad mutation observation degrades WhatsApp performance | Scrolling or message rendering may stutter | Scope observers narrowly, batch work, avoid full rescans, and prefer CSS-only targeting |
| Nested hover selectors reveal too much | Neighboring private fields may become readable | Attach hover rules to the smallest category-owned target and add nested-target regression tests |
| Blur interferes with controls | Users may be unable to open chats, play audio, or open attachments | Preserve pointer events and verify every interactive protected type through manual tests |
| Programmatic injection fails | Privacy cannot be activated on an existing tab | Show the approved reload fallback and preserve configuration through reload |
| Fullscreen exclusion is misunderstood | Users may expect fullscreen media to remain protected | State the exclusion clearly in user-facing documentation and store listing |
| Users interpret blur as data security | Users may assume content is inaccessible rather than visually obscured | Use explicit visual-privacy language in onboarding, documentation, and privacy disclosures |
| Chrome Web Store permission review delays release | MVP distribution may be blocked or delayed | Restrict host access to WhatsApp Web, minimize permissions, and provide clear permission justifications |

### Open Items

- Select the popup UI framework and build tooling.
- Define the delivery deadline.
- Approve the fixed blur design token through visual testing.
- Define the minimum supported Chrome version.
- Record the reference machine used for performance measurements.
- Confirm Chrome Web Store product name, branding, and privacy-policy URL before publication.
