# Privacy for WhatsApp Web

A local-only Chrome extension that blurs sensitive WhatsApp Web content and reveals one protected element at a time on hover.

## Build and install

1. Run `npm install`.
2. Run `npm run build`.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Choose **Load unpacked** and select the generated `dist/` directory.

Use `npm test` to build the extension and run the settings, manifest, selector, and network-surface checks.

## Privacy model

- Only the nine boolean privacy settings are stored in `chrome.storage.local`.
- The extension has no backend, analytics, telemetry, or external network requests.
- Blur is visual only. The underlying WhatsApp content remains available to WhatsApp, browser developer tools, accessibility tools, and other software with page access.
- Media opened in WhatsApp's fullscreen viewer is intentionally not blurred.

## Selector maintenance

Selectors are centralized in `public/privacy.css` and prefer semantic `data-testid`, role, and structural attributes found in the reference captures under `docs/layout/`. Generated WhatsApp class names are intentionally not used. The reference captures are development inputs and are never copied into `dist/`.
