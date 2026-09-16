import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const flushTasks = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

async function loadBackground(initialSettings) {
  const listeners = {};
  const writes = [];
  const iconUpdates = [];
  const importedScripts = [];
  let storedSettings = initialSettings;
  const chrome = {
    action: {
      setIcon: async (details) => iconUpdates.push(JSON.parse(JSON.stringify(details))),
    },
    commands: {
      onCommand: {
        addListener: (listener) => { listeners.command = listener; },
      },
    },
    runtime: {
      onInstalled: {
        addListener: (listener) => { listeners.installed = listener; },
      },
      onStartup: {
        addListener: (listener) => { listeners.startup = listener; },
      },
    },
    storage: {
      local: {
        get: async () => storedSettings === undefined ? {} : { privacySettings: storedSettings },
        set: async (value) => {
          storedSettings = value.privacySettings;
          writes.push(JSON.parse(JSON.stringify(value)));
        },
      },
      onChanged: {
        addListener: (listener) => { listeners.storage = listener; },
      },
    },
  };
  const context = vm.createContext({
    chrome,
    importScripts: (...urls) => importedScripts.push(...urls),
  });
  const settingsSource = await readFile(new URL("../dist/settings.js", import.meta.url), "utf8");
  const backgroundSource = await readFile(new URL("../dist/background.js", import.meta.url), "utf8");
  vm.runInContext(settingsSource, context);
  vm.runInContext(backgroundSource, context);
  await flushTasks();

  return {
    iconUpdates,
    importedScripts,
    listeners,
    storedSettings: () => storedSettings,
    writes,
  };
}

test("panic command toggles master privacy and preserves category choices", async () => {
  const original = {
    enabled: true,
    chatList: {
      enabled: false,
      name: true,
      avatar: false,
      timeAndUnreadCount: true,
      messagePreview: false,
    },
    conversation: {
      enabled: true,
      name: false,
      avatar: true,
      time: false,
      messagesAndCalls: true,
      mediaAndAttachments: false,
      textInput: true,
    },
  };
  const runtime = await loadBackground(original);
  assert.deepEqual(runtime.importedScripts, ["settings.js"]);
  assert.match(runtime.iconUpdates.at(-1).path[16], /icon-16\.png$/);

  runtime.listeners.command("unrelated-command");
  await flushTasks();
  assert.equal(runtime.writes.length, 0);

  runtime.listeners.command("toggle-master-privacy");
  await flushTasks();
  assert.equal(runtime.storedSettings().enabled, false);
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.storedSettings().chatList)), original.chatList);
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.storedSettings().conversation)), original.conversation);
  assert.match(runtime.iconUpdates.at(-1).path[16], /icon-off-16\.png$/);

  runtime.listeners.command("toggle-master-privacy");
  await flushTasks();
  assert.equal(runtime.storedSettings().enabled, true);
  assert.match(runtime.iconUpdates.at(-1).path[16], /icon-16\.png$/);
});

test("background startup and storage changes keep the action icon synchronized", async () => {
  const runtime = await loadBackground(undefined);
  assert.equal(runtime.writes[0].privacySettings.enabled, true);
  assert.match(runtime.iconUpdates.at(-1).path[16], /icon-16\.png$/);

  runtime.listeners.storage({
    privacySettings: {
      newValue: { ...runtime.storedSettings(), enabled: false },
    },
  }, "local");
  await flushTasks();
  assert.match(runtime.iconUpdates.at(-1).path[16], /icon-off-16\.png$/);

  runtime.listeners.startup();
  runtime.listeners.installed();
  await flushTasks();
  assert.match(runtime.iconUpdates.at(-1).path[16], /icon-16\.png$/);
});
