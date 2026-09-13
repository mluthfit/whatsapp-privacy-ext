import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("content runtime starts private, loads storage, syncs changes, and reports health", async () => {
  const attributes = new Map();
  const listeners = {};
  const storedSettings = {
    enabled: false,
    chatList: {
      name: true,
      avatar: false,
      time: true,
      messagePreview: true,
      unreadCount: true,
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
  };
  const context = vm.createContext({
    chrome,
    document: { documentElement },
    getComputedStyle: () => ({
      getPropertyValue: (name) => name === "--wa-privacy-style-version" ? "2" : "",
    }),
  });
  const settingsSource = await readFile(new URL("../dist/settings.js", import.meta.url), "utf8");
  const contentSource = await readFile(new URL("../dist/content.js", import.meta.url), "utf8");

  vm.runInContext(settingsSource, context);
  vm.runInContext(contentSource, context);
  assert.equal(attributes.get("data-wa-privacy-enabled"), "true");

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(attributes.get("data-wa-privacy-enabled"), "false");
  assert.equal(attributes.get("data-wa-privacy-avatar"), "false");
  assert.equal(attributes.get("data-wa-privacy-text-input"), "false");

  listeners.storage({
    privacySettings: {
      newValue: {
        ...storedSettings,
        enabled: true,
        chatList: { ...storedSettings.chatList, name: false },
      },
    },
  }, "local");
  assert.equal(attributes.get("data-wa-privacy-enabled"), "true");
  assert.equal(attributes.get("data-wa-privacy-name"), "false");

  let response;
  listeners.message({ type: "WA_PRIVACY_PING" }, {}, (value) => { response = value; });
  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    ok: true,
    version: 1,
    styleVersion: "2",
  });
});
