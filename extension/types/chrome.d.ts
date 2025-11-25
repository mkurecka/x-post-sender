/**
 * Chrome Extension API Type Definitions
 * Supplements @anthropic-ai/eslint-config for webextensions env
 */

declare namespace chrome {
  namespace runtime {
    function sendMessage<T = unknown>(message: unknown): Promise<T>;
    function sendMessage<T = unknown>(message: unknown, callback: (response: T) => void): void;
    function getURL(path: string): string;

    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: unknown) => void
        ) => boolean | void | Promise<unknown>
      ): void;
    };

    const onInstalled: {
      addListener(callback: (details: { reason: string }) => void): void;
    };

    interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      origin?: string;
    }
  }

  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>;
      get(keys: string | string[] | null, callback: (items: Record<string, unknown>) => void): void;
      set(items: Record<string, unknown>): Promise<void>;
      set(items: Record<string, unknown>, callback?: () => void): void;
      remove(keys: string | string[]): Promise<void>;
      remove(keys: string | string[], callback?: () => void): void;
    }

    const local: StorageArea;
    const sync: StorageArea;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      title?: string;
      active: boolean;
      windowId: number;
    }

    function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function sendMessage<T = unknown>(tabId: number, message: unknown): Promise<T>;
  }

  namespace contextMenus {
    interface CreateProperties {
      id: string;
      title: string;
      contexts: string[];
      parentId?: string;
    }

    function create(createProperties: CreateProperties): void;
    function removeAll(): Promise<void>;

    const onClicked: {
      addListener(
        callback: (
          info: { menuItemId: string; selectionText?: string },
          tab?: chrome.tabs.Tab
        ) => void
      ): void;
    };
  }
}

/**
 * Global function available in service workers
 */
declare function importScripts(...urls: string[]): void;
