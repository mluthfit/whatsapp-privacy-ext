import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("manifest uses the minimum approved MV3 permissions", async () => {
  const manifest = JSON.parse(await readFile(new URL("../dist/manifest.json", import.meta.url)));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["activeTab", "scripting", "storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://web.whatsapp.com/*"]);
  assert.equal(manifest.background.service_worker, "background.js");
  assert.deepEqual(manifest.commands["toggle-master-privacy"].suggested_key, {
    default: "Ctrl+Shift+P",
    mac: "Command+Shift+P",
  });
  assert.equal(manifest.commands["toggle-master-privacy"].description, "Toggle Master Privacy");
  assert.equal(manifest.commands["toggle-master-privacy"].global, undefined);
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
});

test("build provides distinct enabled and disabled icon assets", async () => {
  for (const size of [16, 32, 48, 128]) {
    const enabled = await readFile(new URL(`../dist/icons/icon-${size}.png`, import.meta.url));
    const disabled = await readFile(new URL(`../dist/icons/icon-off-${size}.png`, import.meta.url));
    assert.notDeepEqual(enabled, disabled);
  }

  const disabledLogo = await readFile(new URL("../dist/logo-off.svg", import.meta.url), "utf8");
  assert.match(disabledLogo, /#9AA39F/);
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
    "conversation-info-header",
    "chat-subtitle",
    "conversation-panel-messages",
    "group-chat-profile-picture",
    "msg-container",
    "msg-meta",
    "call-log-system-message",
    "call-log-icon-chip",
    "link-preview-thumbnail-jpeg",
    "compose-box",
    "conversation-compose-box-input",
    "status-list-drawer",
    "status-row-cell",
    "status-header",
    "status-thumbnail",
    "community-tab-drawer",
    "community-tab-community-cell",
    "community-tab-subgroup-cell",
    "community-navigation-drawer",
    "new-chat-drawer",
    "new-group-drawer-participants",
    "contact-list-key",
    "message-yourself-row",
  ];

  for (const selector of requiredSelectors) {
    assert.match(css, new RegExp(`data-testid=\\"${selector}\\"`));
  }
  const listNameRules = css.slice(
    css.indexOf("/* Ordinary chat names"),
    css.indexOf("/* Conversation names"),
  );
  const conversationNameRules = css.slice(
    css.indexOf("/* Conversation names"),
    css.indexOf("/* The first chat-row column"),
  );
  const listAvatarRules = css.slice(
    css.indexOf("/* The first chat-row column"),
    css.indexOf("/* The complete header avatar owner"),
  );
  const conversationAvatarRules = css.slice(
    css.indexOf("/* The complete header avatar owner"),
    css.indexOf("/* Time and unread count"),
  );
  const previewRules = css.slice(
    css.indexOf('html[data-wa-privacy-enabled="true"][data-wa-privacy-message-preview="true"]'),
    css.indexOf("/* Match WhatsApp's tokenized test IDs"),
  );
  const listActivityRules = css.slice(
    css.indexOf("/* Time and unread count"),
    css.indexOf("/* Target only message timestamps"),
  );
  const conversationTimeRules = css.slice(
    css.indexOf("/* Target only message timestamps"),
    css.indexOf('html[data-wa-privacy-enabled="true"][data-wa-privacy-message-preview="true"]'),
  );
  const messageRules = css.slice(
    css.indexOf("/* Match WhatsApp's tokenized test IDs"),
    css.indexOf("/* This positive message-pane scope"),
  );

  assert.match(css, /--wa-privacy-style-version: 14/);
  assert.doesNotMatch(css, /data-wa-privacy-name=/);
  assert.doesNotMatch(css, /data-wa-privacy-avatar=/);
  assert.match(listNameRules, /data-wa-privacy-list-name/);
  assert.match(listNameRules, /\[data-testid="cell-frame-label"\]/);
  assert.doesNotMatch(listNameRules, /last-msg-status/);
  assert.doesNotMatch(listNameRules, /conversation-header|group-message-author/);
  assert.match(listNameRules, /:has\(\s*\[data-testid="cell-frame-label"\]\s*\):not\(:has\(/);
  assert.match(listNameRules, /\[data-testid="cell-frame-label"\] > span\[title\]:hover/);
  assert.match(listNameRules, /\[data-testid="status-list-drawer"\]/);
  assert.match(listNameRules, /\[data-testid="community-tab-drawer"\]/);
  assert.match(listNameRules, /\[data-testid="community-navigation-drawer"\]/);
  assert.match(listNameRules, /\[data-testid="new-chat-drawer"\]/);
  assert.match(listNameRules, /\[data-testid="new-group-drawer-participants"\]/);
  assert.match(listNameRules, /\[data-testid="contact-list-key"\]/);
  assert.match(listNameRules, /\[data-testid="message-yourself-row"\]/);
  assert.match(
    listNameRules,
    /\[data-testid="message-yourself-row"\] \[data-testid="cell-frame-title"\]:not\(:hover\)/,
  );
  assert.match(listNameRules, /\[data-testid="out-contact-cell"\]/);
  assert.doesNotMatch(listNameRules, /section-header/);
  assert.match(conversationNameRules, /data-wa-privacy-conversation-name/);
  assert.match(conversationNameRules, /conversation-header/);
  assert.match(conversationNameRules, /chat-subtitle/);
  assert.match(conversationNameRules, /group-message-author/);
  assert.doesNotMatch(conversationNameRules, /chat-list|status-list-drawer|community-tab-drawer/);
  assert.match(listAvatarRules, /data-wa-privacy-list-avatar/);
  assert.match(listAvatarRules, /button\[data-testid="status-header"\]/);
  assert.match(listAvatarRules, /\[data-testid="status-thumbnail"\] > div:last-child/);
  assert.match(listAvatarRules, /community-tab-community-cell/);
  assert.match(listAvatarRules, /community-tab-subgroup-cell/);
  assert.match(listAvatarRules, /community-navigation-drawer/);
  assert.match(listAvatarRules, /new-chat-drawer/);
  assert.match(listAvatarRules, /new-group-drawer-participants/);
  assert.match(listAvatarRules, /contact-list-key/);
  assert.match(listAvatarRules, /message-yourself-row/);
  assert.match(listAvatarRules, /out-contact-cell/);
  assert.doesNotMatch(listAvatarRules, /conversation-header/);
  assert.match(conversationAvatarRules, /data-wa-privacy-conversation-avatar/);
  assert.match(conversationAvatarRules, /conversation-info-header/);
  assert.match(conversationAvatarRules, /conversation-panel-messages/);
  assert.match(conversationAvatarRules, /group-chat-profile-picture/);
  assert.doesNotMatch(conversationAvatarRules, /chat-list|status-header|community-tab-drawer/);
  assert.match(listActivityRules, /data-wa-privacy-time-unread-count/);
  assert.match(listActivityRules, /cell-frame-primary-detail/);
  assert.match(listActivityRules, /icon-unread-count/);
  assert.match(listActivityRules, /status-list-drawer/);
  assert.match(listActivityRules, /cell-frame-secondary/);
  assert.match(listActivityRules, /community-tab-subgroup-cell/);
  assert.match(listActivityRules, /community-navigation-drawer/);
  assert.match(listActivityRules, /:not\(:has\(/);
  assert.doesNotMatch(listActivityRules, /msg-meta/);
  assert.match(conversationTimeRules, /data-wa-privacy-conversation-time/);
  assert.match(conversationTimeRules, /msg-meta/);
  assert.match(conversationTimeRules, /span:last-child:not\(:hover\)/);
  assert.doesNotMatch(conversationTimeRules, /icon-unread-count|cell-frame-primary-detail/);
  assert.match(previewRules, /\[data-testid="last-msg-status"\]:not\(:hover\)/);
  assert.match(previewRules, /\[data-testid="new-chat-drawer"\]/);
  assert.match(previewRules, /\[data-testid="new-group-drawer-participants"\]/);
  assert.match(previewRules, /\[data-testid="cell-frame-secondary"\]:has\(/);
  assert.match(previewRules, /\[data-testid~="selectable-text"\]\[dir="auto"\]\[title\]/);
  assert.match(
    previewRules,
    /\[data-testid="message-yourself-row"\] \[data-testid="cell-frame-secondary"\]:not\(:hover\)/,
  );
  assert.doesNotMatch(previewRules, /out-contact-cell|section-header/);
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
  assert.match(messageRules, /call-log-system-message[^}]+> div:has\(\[data-testid="call-log-icon-chip"\]\)/s);
  assert.doesNotMatch(css, /\[data-testid="last-msg-status"\]\s*>/);
  assert.doesNotMatch(css, /drawer-fullscreen[^*]*filter:/s);
  assert.doesNotMatch(css, /community-tab-view-all-cell[^,{]*\{[^}]*filter:/s);
  assert.doesNotMatch(css, /new-community-row[^,{]*\{[^}]*filter:/s);
});

test("popup exposes independent list and conversation identity controls", async () => {
  const html = await readFile(new URL("../dist/popup.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../dist/popup.js", import.meta.url), "utf8");
  assert.match(html, /<h2 id="list-views-heading">List Views<\/h2>/);
  assert.doesNotMatch(html, /Lists &amp; Identity/);
  assert.doesNotMatch(html, /<h2[^>]*>Chat list<\/h2>/i);
  assert.match(html, /data-setting="chatList\.timeAndUnreadCount"/);
  assert.match(html, /data-setting="chatList\.enabled"/);
  assert.doesNotMatch(html, /data-setting="chatList\.(?:time|unreadCount)"/);
  assert.match(html, /data-setting="conversation\.name"/);
  assert.match(html, /data-setting="conversation\.enabled"/);
  assert.match(html, /data-setting="conversation\.avatar"/);
  assert.match(html, /data-setting="conversation\.time"/);
  assert.doesNotMatch(html, />[46] controls</);
  assert.equal(html.match(/<input type="checkbox" data-setting=/g)?.length, 13);
  assert.equal(html.match(/data-privacy-logo/g)?.length, 3);
  assert.match(html, /id="shortcut-hint"/);
  assert.match(html, /id="shortcut-settings-button"/);
  assert.match(html, /id="shortcut-action">CHANGE</);
  assert.match(script, /chrome\.commands\.getAll\(\)/);
  assert.match(script, /chrome\.tabs\.create\(\{ url: "chrome:\/\/extensions\/shortcuts" \}\)/);
  assert.match(script, /"Panic: Unassigned"/);
  assert.match(script, /"SET NOW"/);
  assert.match(script, /logo-off\.svg/);
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
