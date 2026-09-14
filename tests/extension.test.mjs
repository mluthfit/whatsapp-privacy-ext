import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("manifest uses the minimum approved MV3 permissions", async () => {
  const manifest = JSON.parse(await readFile(new URL("../dist/manifest.json", import.meta.url)));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["activeTab", "scripting", "storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://web.whatsapp.com/*"]);
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
});

test("privacy stylesheet contains every fixture-backed selector contract", async () => {
  const css = await readFile(new URL("../dist/privacy.css", import.meta.url), "utf8");
  const requiredSelectors = [
    "chat-list",
    "archived-chatlist",
    "cell-frame-title",
    "cell-frame-label",
    "cell-frame-primary-detail",
    "last-msg-status",
    "icon-unread-count",
    "conversation-header",
    "conversation-panel-messages",
    "msg-container",
    "call-log-system-message",
    "link-preview-thumbnail-jpeg",
    "compose-box",
    "conversation-compose-box-input",
    "status-list-drawer",
    "status-row-cell",
    "status-header",
    "status-thumbnail",
  ];

  for (const selector of requiredSelectors) {
    assert.match(css, new RegExp(`data-testid=\\"${selector}\\"`));
  }
  const nameRules = css.slice(
    css.indexOf("/* Ordinary chat names"),
    css.indexOf("/* The first chat-row column"),
  );
  const avatarRules = css.slice(
    css.indexOf("/* The first chat-row column"),
    css.indexOf("/* Time and unread count"),
  );
  const previewRules = css.slice(
    css.indexOf('html[data-wa-privacy-enabled="true"][data-wa-privacy-message-preview="true"]'),
    css.indexOf("/* Message metadata"),
  );
  const activityRules = css.slice(
    css.indexOf("/* Time and unread count"),
    css.indexOf('html[data-wa-privacy-enabled="true"][data-wa-privacy-message-preview="true"]'),
  );
  const messageRules = css.slice(
    css.indexOf("/* Match WhatsApp's tokenized test IDs"),
    css.indexOf("/* This positive message-pane scope"),
  );

  assert.match(css, /--wa-privacy-style-version: 6/);
  assert.match(nameRules, /\[data-testid="cell-frame-label"\]/);
  assert.doesNotMatch(nameRules, /last-msg-status/);
  assert.match(nameRules, /:has\(\s*\[data-testid="cell-frame-label"\]\s*\):not\(:has\(/);
  assert.match(nameRules, /\[data-testid="cell-frame-label"\] > span\[title\]:hover/);
  assert.match(nameRules, /\[data-testid="status-list-drawer"\]/);
  assert.match(avatarRules, /button\[data-testid="status-header"\]/);
  assert.match(avatarRules, /\[data-testid="status-thumbnail"\] > div:last-child/);
  assert.match(activityRules, /data-wa-privacy-time-unread-count/);
  assert.match(activityRules, /cell-frame-primary-detail/);
  assert.match(activityRules, /icon-unread-count/);
  assert.match(activityRules, /status-list-drawer/);
  assert.match(activityRules, /cell-frame-secondary/);
  assert.match(activityRules, /:not\(:has\(/);
  assert.match(previewRules, /\[data-testid="last-msg-status"\]:not\(:hover\)/);
  assert.match(messageRules, /\[data-testid~="selectable-text"\]/);
  assert.match(
    messageRules,
    /:not\(\s*\[data-testid~="selectable-text"\] \[data-testid~="selectable-text"\]\s*\)/,
  );
  assert.doesNotMatch(messageRules, /:is\(span, a, strong\)/);
  assert.match(messageRules, /:not\(\[data-testid~="search-the-web-link"\]\)/);
  assert.match(
    messageRules,
    /\[data-testid="forwarded-header"\] span:has\(> \[data-testid~="search-the-web-link"\]\):not\(:hover\)/,
  );
  assert.doesNotMatch(css, /\[data-testid="last-msg-status"\]\s*>/);
  assert.doesNotMatch(css, /drawer-fullscreen[^*]*filter:/s);
});

test("popup exposes one combined time and unread count control", async () => {
  const html = await readFile(new URL("../dist/popup.html", import.meta.url), "utf8");
  assert.match(html, /data-setting="chatList\.timeAndUnreadCount"/);
  assert.doesNotMatch(html, /data-setting="chatList\.(?:time|unreadCount)"/);
  assert.match(html, />4 controls</);
});

test("production code contains no networking or remote resources", async () => {
  const outputUrl = new URL("../dist/", import.meta.url);
  const files = (await readdir(outputUrl)).filter((file) => /\.(?:js|css|html|json)$/.test(file));
  const text = await Promise.all(files.map((file) => readFile(new URL(file, outputUrl), "utf8")));
  const source = text.join("\n");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bXMLHttpRequest\b/);
  assert.doesNotMatch(source, /\bWebSocket\b/);
  assert.doesNotMatch(source, /<(?:script|link|img)[^>]+https?:\/\//i);
});
