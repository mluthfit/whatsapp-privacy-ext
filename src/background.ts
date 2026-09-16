declare function importScripts(...urls: string[]): void;

importScripts("settings.js");

const TOGGLE_MASTER_COMMAND = "toggle-master-privacy";
const enabledIconPaths = {
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
};
const disabledIconPaths = {
  16: "icons/icon-off-16.png",
  32: "icons/icon-off-32.png",
  48: "icons/icon-off-48.png",
  128: "icons/icon-off-128.png",
};

async function setActionIcon(enabled: boolean): Promise<void> {
  await chrome.action.setIcon({ path: enabled ? enabledIconPaths : disabledIconPaths });
}

async function syncActionIcon(): Promise<void> {
  const settings = await WAPrivacy.loadSettings();
  await setActionIcon(settings.enabled);
}

async function toggleMasterPrivacy(): Promise<void> {
  const settings = await WAPrivacy.loadSettings();
  const updated = await WAPrivacy.saveSettings(
    WAPrivacy.withSetting(settings, "enabled", !settings.enabled),
  );
  await setActionIcon(updated.enabled);
}

function runQuietly(action: () => Promise<void>): void {
  void action().catch(() => undefined);
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== TOGGLE_MASTER_COMMAND) return;
  runQuietly(toggleMasterPrivacy);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !(WAPrivacy.SETTINGS_KEY in changes)) return;
  const settings = WAPrivacy.normalizeSettings(changes[WAPrivacy.SETTINGS_KEY]?.newValue);
  runQuietly(() => setActionIcon(settings.enabled));
});

chrome.runtime.onInstalled.addListener(() => runQuietly(syncActionIcon));
chrome.runtime.onStartup.addListener(() => runQuietly(syncActionIcon));
runQuietly(syncActionIcon);
