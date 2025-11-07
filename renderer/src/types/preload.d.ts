// Global types for the preload-exposed API (window.api)

type NavResult = { success: boolean; url?: string; error?: string };
type GenericResult = { success: boolean; error?: string };

interface DyslexiBrowseAPI {
  navigate: (url: string) => Promise<NavResult>;
  goBack: () => Promise<GenericResult>;
  goForward: () => Promise<GenericResult>;
  reload: () => Promise<GenericResult>;
  showBrowserView: () => Promise<GenericResult>;
  hideBrowserView: () => Promise<GenericResult>;
  enterSettings: () => Promise<GenericResult>;  // NEW
  exitSettings: () => Promise<GenericResult>;   // NEW
  injectCSS: (css: string) => Promise<GenericResult>;
  removeCSS: () => Promise<GenericResult>;
  runScript: (code: string) => Promise<{ success: boolean; result?: unknown; error?: string }>;

  saveProfile: (profile: unknown) => Promise<GenericResult>;
  loadProfile: () => Promise<{ success: boolean; data: unknown }>;

  getCurrentURL: () => Promise<string | null>;
}

declare global {
  interface Window { api?: DyslexiBrowseAPI }
}
export {};
