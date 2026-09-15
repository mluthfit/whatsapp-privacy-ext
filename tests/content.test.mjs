import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("content runtime starts private, loads storage, syncs changes, and reports health", async () => {
  const attributes = new Map([
    ["data-wa-privacy-name", "true"],
    ["data-wa-privacy-avatar", "true"],
    ["data-wa-privacy-time", "true"],
    ["data-wa-privacy-unread-count", "true"],
  ]);
  const listeners = {};
  const storedSettings = {
    enabled: false,
    chatList: {
      enabled: false,
      name: true,
      avatar: false,
      timeAndUnreadCount: true,
      messagePreview: true,
    },
    conversation: {
      enabled: true,
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
      getPropertyValue: (name) => name === "--wa-privacy-style-version" ? "11" : "",
    }),
  });
  const settingsSource = await readFile(new URL("../dist/settings.js", import.meta.url), "utf8");
  const contentSource = await readFile(new URL("../dist/content.js", import.meta.url), "utf8");

  vm.runInContext(settingsSource, context);
  vm.runInContext(contentSource, context);
  assert.equal(attributes.get("data-wa-privacy-enabled"), "true");

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(attributes.get("data-wa-privacy-enabled"), "false");
  assert.equal(attributes.get("data-wa-privacy-list-name"), "false");
  assert.equal(attributes.get("data-wa-privacy-conversation-name"), "true");
  assert.equal(attributes.get("data-wa-privacy-list-avatar"), "false");
  assert.equal(attributes.get("data-wa-privacy-conversation-avatar"), "false");
  assert.equal(attributes.get("data-wa-privacy-conversation-time"), "true");
  assert.equal(attributes.get("data-wa-privacy-time-unread-count"), "false");
  assert.equal(attributes.get("data-wa-privacy-message-preview"), "false");
  assert.equal(attributes.get("data-wa-privacy-text-input"), "false");
  assert.equal(attributes.has("data-wa-privacy-time"), false);
  assert.equal(attributes.has("data-wa-privacy-unread-count"), false);
  assert.equal(attributes.has("data-wa-privacy-name"), false);
  assert.equal(attributes.has("data-wa-privacy-avatar"), false);

  listeners.storage({
    privacySettings: {
      newValue: {
        ...storedSettings,
        enabled: true,
        chatList: { ...storedSettings.chatList, enabled: true, name: false },
        conversation: {
          ...storedSettings.conversation,
          enabled: false,
          name: true,
          avatar: true,
          time: false,
        },
      },
    },
  }, "local");
  assert.equal(attributes.get("data-wa-privacy-enabled"), "true");
  assert.equal(attributes.get("data-wa-privacy-list-name"), "false");
  assert.equal(attributes.get("data-wa-privacy-list-avatar"), "false");
  assert.equal(attributes.get("data-wa-privacy-time-unread-count"), "true");
  assert.equal(attributes.get("data-wa-privacy-message-preview"), "true");
  assert.equal(attributes.get("data-wa-privacy-conversation-name"), "false");
  assert.equal(attributes.get("data-wa-privacy-conversation-avatar"), "false");
  assert.equal(attributes.get("data-wa-privacy-conversation-time"), "false");
  assert.equal(attributes.get("data-wa-privacy-messages-calls"), "false");
  assert.equal(attributes.get("data-wa-privacy-media-attachments"), "false");
  assert.equal(attributes.get("data-wa-privacy-text-input"), "false");

  listeners.storage({
    privacySettings: {
      newValue: {
        ...storedSettings,
        enabled: true,
        chatList: { ...storedSettings.chatList, enabled: true, name: false },
        conversation: {
          ...storedSettings.conversation,
          enabled: true,
          name: true,
          avatar: true,
          time: false,
        },
      },
    },
  }, "local");
  assert.equal(attributes.get("data-wa-privacy-conversation-name"), "true");
  assert.equal(attributes.get("data-wa-privacy-conversation-avatar"), "true");
  assert.equal(attributes.get("data-wa-privacy-conversation-time"), "false");
  assert.equal(attributes.get("data-wa-privacy-messages-calls"), "true");
  assert.equal(attributes.get("data-wa-privacy-media-attachments"), "true");
  assert.equal(attributes.get("data-wa-privacy-text-input"), "false");

  let response;
  listeners.message({ type: "WA_PRIVACY_PING" }, {}, (value) => { response = value; });
  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    ok: true,
    version: 1,
    styleVersion: "11",
  });
});
