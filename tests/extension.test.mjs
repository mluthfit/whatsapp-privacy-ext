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
  ];

  for (const selector of requiredSelectors) {
    assert.match(css, new RegExp(`data-testid=\\"${selector}\\"`));
  }
  assert.match(css, /--wa-privacy-style-version: 1/);
  assert.match(css, /> div:first-child > div > span\[dir="auto"\]/);
  assert.match(css, /> :not\(div:has\(> div > span\[dir="auto"\]\)\)/);
  assert.doesNotMatch(css, /drawer-fullscreen[^*]*filter:/s);
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
