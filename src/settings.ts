namespace WAPrivacy {
  export const SETTINGS_KEY = "privacySettings";
  export const STYLE_VERSION = "14";

  export type SettingPath =
    | "enabled"
    | "chatList.enabled"
    | "chatList.name"
    | "chatList.avatar"
    | "chatList.timeAndUnreadCount"
    | "chatList.messagePreview"
    | "conversation.enabled"
    | "conversation.name"
    | "conversation.avatar"
    | "conversation.time"
    | "conversation.messagesAndCalls"
    | "conversation.mediaAndAttachments"
    | "conversation.textInput";

  export interface PrivacySettings {
    enabled: boolean;
    chatList: {
      enabled: boolean;
      name: boolean;
      avatar: boolean;
      timeAndUnreadCount: boolean;
      messagePreview: boolean;
    };
    conversation: {
      enabled: boolean;
      name: boolean;
      avatar: boolean;
      time: boolean;
      messagesAndCalls: boolean;
      mediaAndAttachments: boolean;
      textInput: boolean;
    };
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function booleanOrDefault(value: unknown): boolean {
    return typeof value === "boolean" ? value : true;
  }

  export function defaultSettings(): PrivacySettings {
    return {
      enabled: true,
      chatList: {
        enabled: true,
        name: true,
        avatar: true,
        timeAndUnreadCount: true,
        messagePreview: true,
      },
      conversation: {
        enabled: true,
        name: true,
        avatar: true,
        time: true,
        messagesAndCalls: true,
        mediaAndAttachments: true,
        textInput: true,
      },
    };
  }

  export function normalizeSettings(value: unknown): PrivacySettings {
    const root = isRecord(value) ? value : {};
    const chatList = isRecord(root.chatList) ? root.chatList : {};
    const conversation = isRecord(root.conversation) ? root.conversation : {};

    const timeAndUnreadCount = typeof chatList.timeAndUnreadCount === "boolean"
      ? chatList.timeAndUnreadCount
      : booleanOrDefault(chatList.time) || booleanOrDefault(chatList.unreadCount);

    return {
      enabled: booleanOrDefault(root.enabled),
      chatList: {
        enabled: booleanOrDefault(chatList.enabled),
        name: booleanOrDefault(chatList.name),
        avatar: booleanOrDefault(chatList.avatar),
        timeAndUnreadCount,
        messagePreview: booleanOrDefault(chatList.messagePreview),
      },
      conversation: {
        enabled: booleanOrDefault(conversation.enabled),
        name: typeof conversation.name === "boolean"
          ? conversation.name
          : booleanOrDefault(chatList.name),
        avatar: typeof conversation.avatar === "boolean"
          ? conversation.avatar
          : booleanOrDefault(chatList.avatar),
        time: booleanOrDefault(conversation.time),
        messagesAndCalls: booleanOrDefault(conversation.messagesAndCalls),
        mediaAndAttachments: booleanOrDefault(conversation.mediaAndAttachments),
        textInput: booleanOrDefault(conversation.textInput),
      },
    };
  }

  function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
    const actualKeys = Object.keys(value);
    return actualKeys.length === keys.length && keys.every((key) => actualKeys.includes(key));
  }

  function isCanonicalSettings(value: unknown): value is PrivacySettings {
    if (!isRecord(value) || !isRecord(value.chatList) || !isRecord(value.conversation)) {
      return false;
    }

    return hasExactKeys(value, ["enabled", "chatList", "conversation"])
      && hasExactKeys(value.chatList, ["enabled", "name", "avatar", "timeAndUnreadCount", "messagePreview"])
      && hasExactKeys(value.conversation, [
        "enabled",
        "name",
        "avatar",
        "time",
        "messagesAndCalls",
        "mediaAndAttachments",
        "textInput",
      ])
      && typeof value.enabled === "boolean"
      && Object.values(value.chatList).every((item) => typeof item === "boolean")
      && Object.values(value.conversation).every((item) => typeof item === "boolean");
  }

  export async function loadSettings(): Promise<PrivacySettings> {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    const rawSettings = stored[SETTINGS_KEY];
    const settings = normalizeSettings(rawSettings);

    if (!isCanonicalSettings(rawSettings)) {
      await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    }

    return settings;
  }

  export async function saveSettings(settings: PrivacySettings): Promise<PrivacySettings> {
    const normalized = normalizeSettings(settings);
    await chrome.storage.local.set({ [SETTINGS_KEY]: normalized });
    return normalized;
  }

  export function withSetting(
    settings: PrivacySettings,
    path: SettingPath,
    value: boolean,
  ): PrivacySettings {
    const next = normalizeSettings(settings);

    switch (path) {
      case "enabled":
        next.enabled = value;
        break;
      case "chatList.enabled":
        next.chatList.enabled = value;
        break;
      case "chatList.name":
        next.chatList.name = value;
        break;
      case "chatList.avatar":
        next.chatList.avatar = value;
        break;
      case "chatList.timeAndUnreadCount":
        next.chatList.timeAndUnreadCount = value;
        break;
      case "chatList.messagePreview":
        next.chatList.messagePreview = value;
        break;
      case "conversation.enabled":
        next.conversation.enabled = value;
        break;
      case "conversation.name":
        next.conversation.name = value;
        break;
      case "conversation.avatar":
        next.conversation.avatar = value;
        break;
      case "conversation.time":
        next.conversation.time = value;
        break;
      case "conversation.messagesAndCalls":
        next.conversation.messagesAndCalls = value;
        break;
      case "conversation.mediaAndAttachments":
        next.conversation.mediaAndAttachments = value;
        break;
      case "conversation.textInput":
        next.conversation.textInput = value;
        break;
    }

    return next;
  }
}
