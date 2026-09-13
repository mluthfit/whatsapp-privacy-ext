interface PrivacyRuntimeGlobal {
  __waPrivacyRuntime?: boolean;
}

(() => {
  const runtime = globalThis as typeof globalThis & PrivacyRuntimeGlobal;
  if (runtime.__waPrivacyRuntime) return;
  runtime.__waPrivacyRuntime = true;

  const attributeNames = {
    enabled: "data-wa-privacy-enabled",
    name: "data-wa-privacy-name",
    avatar: "data-wa-privacy-avatar",
    timeAndUnreadCount: "data-wa-privacy-time-unread-count",
    messagePreview: "data-wa-privacy-message-preview",
    messagesAndCalls: "data-wa-privacy-messages-calls",
    mediaAndAttachments: "data-wa-privacy-media-attachments",
    textInput: "data-wa-privacy-text-input",
  } as const;

  function setBooleanAttribute(name: string, value: boolean): void {
    document.documentElement.setAttribute(name, String(value));
  }

  function applySettings(settings: WAPrivacy.PrivacySettings): void {
    setBooleanAttribute(attributeNames.enabled, settings.enabled);
    setBooleanAttribute(attributeNames.name, settings.chatList.name);
    setBooleanAttribute(attributeNames.avatar, settings.chatList.avatar);
    setBooleanAttribute(attributeNames.timeAndUnreadCount, settings.chatList.timeAndUnreadCount);
    setBooleanAttribute(attributeNames.messagePreview, settings.chatList.messagePreview);
    document.documentElement.removeAttribute("data-wa-privacy-time");
    document.documentElement.removeAttribute("data-wa-privacy-unread-count");
    setBooleanAttribute(attributeNames.messagesAndCalls, settings.conversation.messagesAndCalls);
    setBooleanAttribute(attributeNames.mediaAndAttachments, settings.conversation.mediaAndAttachments);
    setBooleanAttribute(attributeNames.textInput, settings.conversation.textInput);
  }

  // Protect the first render with privacy-first defaults while storage resolves.
  applySettings(WAPrivacy.defaultSettings());

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (
      typeof message === "object"
      && message !== null
      && "type" in message
      && message.type === "WA_PRIVACY_PING"
    ) {
      const styleVersion = getComputedStyle(document.documentElement)
        .getPropertyValue("--wa-privacy-style-version")
        .trim();
      sendResponse({ ok: true, version: 1, styleVersion });
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !(WAPrivacy.SETTINGS_KEY in changes)) return;
    applySettings(WAPrivacy.normalizeSettings(changes[WAPrivacy.SETTINGS_KEY]?.newValue));
  });

  void WAPrivacy.loadSettings().then(applySettings).catch(() => {
    // Defaults remain active when extension storage is temporarily unavailable.
  });
})();
