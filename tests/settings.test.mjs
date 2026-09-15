import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadSettingsApi(chrome) {
  const source = await readFile(new URL("../dist/settings.js", import.meta.url), "utf8");
  const context = vm.createContext(chrome ? { chrome } : {});
  vm.runInContext(source, context);
  return context.WAPrivacy;
}

test("privacy-first defaults enable every category", async () => {
  const api = await loadSettingsApi();
  const settings = api.defaultSettings();
  assert.equal(settings.enabled, true);
  assert.deepEqual(
    JSON.parse(JSON.stringify(settings.chatList)),
    { name: true, avatar: true, timeAndUnreadCount: true, messagePreview: true },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(settings.conversation)),
    { name: true, messagesAndCalls: true, mediaAndAttachments: true, textInput: true },
  );
});

test("malformed fields are sanitized without losing valid booleans", async () => {
  const api = await loadSettingsApi();
  const settings = api.normalizeSettings({
    enabled: false,
    chatList: { name: false, avatar: "no", unreadCount: 0 },
    conversation: { name: false, messagesAndCalls: false, textInput: null },
  });

  assert.equal(settings.enabled, false);
  assert.equal(settings.chatList.name, false);
  assert.equal(settings.chatList.avatar, true);
  assert.equal(settings.chatList.timeAndUnreadCount, true);
  assert.equal(settings.conversation.name, false);
  assert.equal(settings.conversation.messagesAndCalls, false);
  assert.equal(settings.conversation.mediaAndAttachments, true);
  assert.equal(settings.conversation.textInput, true);
});

test("each toggle changes independently and master preserves categories", async () => {
  const api = await loadSettingsApi();
  const original = api.defaultSettings();
  const previewOff = api.withSetting(original, "chatList.messagePreview", false);
  const listNameOff = api.withSetting(previewOff, "chatList.name", false);
  const conversationNameOff = api.withSetting(previewOff, "conversation.name", false);
  const masterOff = api.withSetting(listNameOff, "enabled", false);
  const masterOn = api.withSetting(masterOff, "enabled", true);

  assert.equal(original.chatList.messagePreview, true);
  assert.equal(listNameOff.conversation.name, true);
  assert.equal(conversationNameOff.chatList.name, true);
  assert.equal(masterOn.enabled, true);
  assert.equal(masterOn.chatList.messagePreview, false);
  assert.equal(masterOn.chatList.name, false);
  assert.equal(masterOn.conversation.name, true);
  assert.equal(masterOn.conversation.textInput, true);
});

test("legacy conversation name state migrates from the list name setting", async () => {
  const writes = [];
  const api = await loadSettingsApi({
    storage: {
      local: {
        get: async () => ({
          privacySettings: {
            chatList: { name: false },
            conversation: {},
          },
        }),
        set: async (value) => writes.push(value),
      },
    },
  });

  assert.equal(api.normalizeSettings({
    chatList: { name: false },
    conversation: {},
  }).conversation.name, false);
  assert.equal(api.normalizeSettings({
    chatList: { name: false },
    conversation: { name: true },
  }).conversation.name, true);

  const migrated = await api.loadSettings();
  assert.equal(migrated.conversation.name, false);
  assert.equal(writes[0].privacySettings.conversation.name, false);
});

test("legacy time and unread settings migrate into one privacy-safe value", async () => {
  const api = await loadSettingsApi();

  assert.equal(api.normalizeSettings({
    chatList: { time: false, unreadCount: false },
  }).chatList.timeAndUnreadCount, false);
  assert.equal(api.normalizeSettings({
    chatList: { time: false, unreadCount: true },
  }).chatList.timeAndUnreadCount, true);
  assert.equal(api.normalizeSettings({
    chatList: { time: true, unreadCount: false },
  }).chatList.timeAndUnreadCount, true);
});

test("loading missing settings persists sanitized privacy-first defaults", async () => {
  const writes = [];
  const api = await loadSettingsApi({
    storage: {
      local: {
        get: async () => ({}),
        set: async (value) => writes.push(value),
      },
    },
  });

  const settings = await api.loadSettings();
  assert.equal(settings.enabled, true);
  assert.equal(settings.conversation.mediaAndAttachments, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].privacySettings.chatList.timeAndUnreadCount, true);
});

test("saving settings stores only the canonical boolean shape", async () => {
  const writes = [];
  const api = await loadSettingsApi({
    storage: {
      local: {
        get: async () => ({}),
        set: async (value) => writes.push(value),
      },
    },
  });

  await api.saveSettings({
    enabled: false,
    extra: "removed",
    chatList: { name: false },
    conversation: { name: true, textInput: false },
  });

  assert.deepEqual(Object.keys(writes[0].privacySettings), ["enabled", "chatList", "conversation"]);
  assert.equal(writes[0].privacySettings.enabled, false);
  assert.equal(writes[0].privacySettings.chatList.name, false);
  assert.equal(writes[0].privacySettings.chatList.avatar, true);
  assert.equal(writes[0].privacySettings.chatList.timeAndUnreadCount, true);
  assert.equal(writes[0].privacySettings.conversation.name, true);
  assert.equal(writes[0].privacySettings.conversation.textInput, false);
});
