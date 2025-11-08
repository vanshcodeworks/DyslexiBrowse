import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Loading preload script...');

const api = {
  navigate: (url: string) => {
    console.log('[Preload] navigate called with:', url);
    return ipcRenderer.invoke('browser:navigate', url);
  },
  goBack: () => ipcRenderer.invoke('browser:go-back'),
  goForward: () => ipcRenderer.invoke('browser:go-forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  showBrowserView: () => ipcRenderer.invoke('browser:show-view'),
  hideBrowserView: () => ipcRenderer.invoke('browser:hide-view'),
  enterSettings: () => ipcRenderer.invoke('ui:enter-settings'), // NEW
  exitSettings: () => ipcRenderer.invoke('ui:exit-settings'),   // NEW
  injectCSS: (css: string) => ipcRenderer.invoke('adapt:inject-css', css),
  removeCSS: () => ipcRenderer.invoke('adapt:remove-css'), // Added this
  runScript: (code: string) => ipcRenderer.invoke('adapt:execute-js', code),
  saveProfile: (profile: unknown) => ipcRenderer.invoke('profile:save', profile),
  loadProfile: () => ipcRenderer.invoke('profile:load'),
  getCurrentURL: () => ipcRenderer.invoke('browser:get-current-url'),
  overlayEnsure: () => ipcRenderer.invoke('overlay:ensure'),
  overlayShow: () => ipcRenderer.invoke('overlay:show'),
  overlayHide: () => ipcRenderer.invoke('overlay:hide'),
  onShowSummary: (cb: (payload: { summary: string; source: string }) => void) => {
    const ch = 'show-summary'; const l = (_: any, p: any) => cb(p); ipcRenderer.on(ch, l); return () => ipcRenderer.removeListener(ch, l);
  },
  onTTSStarted: (cb: (payload: { text: string }) => void) => {
    const ch = 'tts-started'; const l = (_: any, p: any) => cb(p); ipcRenderer.on(ch, l); return () => ipcRenderer.removeListener(ch, l);
  },
  onViewDomReady: (cb: (payload: { url: string }) => void) => {
    const ch = 'view:dom-ready'; const l = (_: any, p: any) => cb(p); ipcRenderer.on(ch, l); return () => ipcRenderer.removeListener(ch, l);
  }
};

console.log('[Preload] Exposing API to main world...');
contextBridge.exposeInMainWorld('api', api);
console.log('[Preload] API exposed successfully');

// Type definitions for TypeScript
export interface ElectronAPI {
  injectCSS: (css: string) => Promise<{ success: boolean }>;
  removeCSS: () => Promise<{ success: boolean }>;
  getAssessmentData: () => Promise<any>;
  saveUserProfile: (profile: any) => Promise<{ success: boolean }>;
  saveAssessmentData: (data: any) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    api: typeof api;
  }
}

// NOTE: overlay* methods now unused after side panel migration.
// Auto summary / selection TTS / image hover implemented via runScript polling in renderer.
