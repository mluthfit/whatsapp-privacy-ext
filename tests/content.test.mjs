import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("content runtime starts private, loads storage, syncs changes, and reports health", async () => {
  const attributes = new Map([
    ["data-wa-privacy-name", "true"],
    ["data-wa-privacy-time", "true"],
    ["data-wa-privacy-unread-count", "true"],
  ]);
  const listeners = {};
  const storedSettings = {
    enabled: false,
    chatList: {
      name: true,
      avatar: false,
      timeAndUnreadCount: true,
      messagePreview: true,
    },
    conversation: {
      messagesAndCalls: true,
      mediaAndAttachments: true,
      textInput: false,
    },
  };
  const chrome = {
    runtime: {
      onMessage: {
        addListener: (listener) => { listeners.message = listener; },
      },
    },
    storage: {
      local: {
        get: async () => ({ privacySettings: storedSettings }),
        set: async () => undefined,
      },
      onChanged: {
        addListener: (listener) => { listeners.storage = listener; },
      },
    },
  };
  const documentElement = {
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  };
  const context = vm.createContext({
    chrome,
    document: { documentElement },
    getComputedStyle: () => ({
      getPropertyValue: (name) => name === "--wa-privacy-style-version" ? "8" : "",
    }),
  });
  const settingsSource = await readFile(new URL("../dist/settings.js", import.meta.url), "utf8");
  const contentSource = await readFile(new URL("../dist/content.js", import.meta.url), "utf8");

  vm.runInContext(settingsSource, context);
  vm.runInContext(contentSource, context);
  assert.equal(attributes.get("data-wa-privacy-enabled"), "true");

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(attributes.get("data-wa-privacy-enabled"), "false");
  assert.equal(attributes.get("data-wa-privacy-list-name"), "true");
  assert.equal(attributes.get("data-wa-privacy-conversation-name"), "true");
  assert.equal(attributes.get("data-wa-privacy-avatar"), "false");
  assert.equal(attributes.get("data-wa-privacy-time-unread-count"), "true");
  assert.equal(attributes.get("data-wa-privacy-text-input"), "false");
  assert.equal(attributes.has("data-wa-privacy-time"), false);
  assert.equal(attributes.has("data-wa-privacy-unread-count"), false);
  assert.equal(attributes.has("data-wa-privacy-name"), false);

  listeners.storage({
    privacySettings: {
      newValue: {
        ...storedSettings,
        enabled: true,
        chatList: { ...storedSettings.chatList, name: false },
        conversation: { ...storedSettings.conversation, name: true },
      },
    },
  }, "local");
  assert.equal(attributes.get("data-wa-privacy-enabled"), "true");
  assert.equal(attributes.get("data-wa-privacy-list-name"), "false");
  assert.equal(attributes.get("data-wa-privacy-conversation-name"), "true");

  let response;
  listeners.message({ type: "WA_PRIVACY_PING" }, {}, (value) => { response = value; });
  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    ok: true,
    version: 1,
    styleVersion: "8",
  });
});
