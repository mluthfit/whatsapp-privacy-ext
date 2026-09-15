interface HealthResponse {
  ok?: boolean;
  styleVersion?: string;
}

const normalView = document.querySelector<HTMLElement>("#normal-view");
const fallbackView = document.querySelector<HTMLElement>("#fallback-view");
const checkingView = document.querySelector<HTMLElement>("#checking-view");
const reloadButton = document.querySelector<HTMLButtonElement>("#reload-button");
const masterStatus = document.querySelector<HTMLElement>("#master-status");
const masterDetail = document.querySelector<HTMLElement>("#master-detail");
const settingInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>("input[data-setting]"),
);

let activeWhatsAppTabId: number | undefined;
let settings = WAPrivacy.defaultSettings();
let tabContext: "checking" | "active" | "not-whatsapp" | "unknown" = "checking";

function showNormalView(): void {
  if (normalView) normalView.hidden = false;
  if (fallbackView) fallbackView.hidden = true;
  if (checkingView) checkingView.hidden = true;
}

function showFallbackView(): void {
  if (normalView) normalView.hidden = true;
  if (fallbackView) fallbackView.hidden = false;
  if (checkingView) checkingView.hidden = true;
}

function settingValue(path: WAPrivacy.SettingPath): boolean {
  switch (path) {
    case "enabled": return settings.enabled;
    case "chatList.name": return settings.chatList.name;
    case "chatList.avatar": return settings.chatList.avatar;
    case "chatList.timeAndUnreadCount": return settings.chatList.timeAndUnreadCount;
    case "chatList.messagePreview": return settings.chatList.messagePreview;
    case "conversation.name": return settings.conversation.name;
    case "conversation.avatar": return settings.conversation.avatar;
    case "conversation.time": return settings.conversation.time;
    case "conversation.messagesAndCalls": return settings.conversation.messagesAndCalls;
    case "conversation.mediaAndAttachments": return settings.conversation.mediaAndAttachments;
    case "conversation.textInput": return settings.conversation.textInput;
  }
}

function renderSettings(): void {
  for (const input of settingInputs) {
    input.checked = settingValue(input.dataset.setting as WAPrivacy.SettingPath);
  }

  document.body.dataset.enabled = String(settings.enabled);
  if (masterStatus) masterStatus.textContent = settings.enabled ? "ON" : "OFF";
  if (masterDetail) {
    if (!settings.enabled) {
      masterDetail.textContent = "Paused. Your category choices are retained";
    } else if (tabContext === "active") {
      masterDetail.textContent = "Active on this WhatsApp Web tab";
    } else if (tabContext === "not-whatsapp") {
      masterDetail.textContent = "Ready for WhatsApp Web";
    } else if (tabContext === "unknown") {
      masterDetail.textContent = "Settings loaded. Tab status unavailable";
    } else {
      masterDetail.textContent = "Checking the current tab...";
    }
  }
}

function isWhatsAppUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "web.whatsapp.com";
  } catch {
    return false;
  }
}

async function contentScriptIsReady(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage<
      { type: string },
      HealthResponse
    >(tabId, { type: "WA_PRIVACY_PING" });
    return response?.ok === true && response.styleVersion === WAPrivacy.STYLE_VERSION;
  } catch {
    return false;
  }
}

async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    const styleResult = await chrome.scripting.executeScript({
      target: { tabId },
      func: (expectedVersion: string) => getComputedStyle(document.documentElement)
        .getPropertyValue("--wa-privacy-style-version")
        .trim() === expectedVersion,
      args: [WAPrivacy.STYLE_VERSION],
    });

    if (styleResult[0]?.result !== true) {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["privacy.css"],
      });
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["settings.js", "content.js"],
      injectImmediately: true,
    });

    return await contentScriptIsReady(tabId);
  } catch {
    return false;
  }
}

async function verifyActiveTab(): Promise<void> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || activeTab.id === undefined || !isWhatsAppUrl(activeTab.url)) {
    tabContext = "not-whatsapp";
    renderSettings();
    showNormalView();
    return;
  }

  activeWhatsAppTabId = activeTab.id;
  if (await contentScriptIsReady(activeTab.id) || await injectContentScript(activeTab.id)) {
    tabContext = "active";
    renderSettings();
    showNormalView();
    return;
  }

  showFallbackView();
}

for (const input of settingInputs) {
  input.addEventListener("change", () => {
    const path = input.dataset.setting as WAPrivacy.SettingPath;
    settings = WAPrivacy.withSetting(settings, path, input.checked);
    renderSettings();
    void WAPrivacy.saveSettings(settings).catch(() => {
      void WAPrivacy.loadSettings().then((storedSettings) => {
        settings = storedSettings;
        renderSettings();
      }).catch(() => undefined);
    });
  });
}

reloadButton?.addEventListener("click", () => {
  if (activeWhatsAppTabId === undefined) return;
  reloadButton.disabled = true;
  reloadButton.textContent = "Reloading...";
  reloadButton.setAttribute("aria-busy", "true");
  void chrome.tabs.reload(activeWhatsAppTabId);
});

renderSettings();

if (typeof chrome !== "undefined" && chrome.storage?.local) {
  const settingsPromise = WAPrivacy.loadSettings().then((storedSettings) => {
    settings = storedSettings;
    renderSettings();
  }).catch(() => undefined);

  const verificationPromise = verifyActiveTab().catch(() => {
    tabContext = "unknown";
    renderSettings();
    showNormalView();
  });

  void Promise.all([settingsPromise, verificationPromise]);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !(WAPrivacy.SETTINGS_KEY in changes)) return;
    settings = WAPrivacy.normalizeSettings(changes[WAPrivacy.SETTINGS_KEY]?.newValue);
    renderSettings();
  });
} else {
  tabContext = "not-whatsapp";
  renderSettings();
  showNormalView();
}
