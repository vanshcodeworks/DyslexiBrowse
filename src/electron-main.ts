import { app, BrowserWindow, ipcMain, session, BrowserView, Menu } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { adaptationAgentScript } from './adaptationAgent';

let mainWindow: BrowserWindow | null = null;
let activeView: BrowserView | null = null;
let overlayWindow: BrowserWindow | null = null; // NEW overlay window
let viewLocked = false; // lock while settings/onboarding is open
let settingsMode = false; // NEW: when true, never attach or create BrowserView

const NAV_HEIGHT = 110; // single source of truth for toolbar height

function resizeBrowserView() {
  if (!mainWindow || !activeView) return;
  const bounds = mainWindow.getContentBounds();
  console.log('[BrowserView] Window bounds:', bounds);
  
  // Reserve space for React navigation bar + status (110px total)
  // BrowserView renders BELOW the React overlay layer
  const navHeight = 110;
  activeView.setBounds({ 
    x: 0, 
    y: NAV_HEIGHT, 
    width: bounds.width, 
    height: bounds.height - NAV_HEIGHT 
  });
  
  // Ensure opaque background (prevents visual glitches behind overlay window)
  try { activeView.setBackgroundColor('#ffffff'); } catch {}
  
  console.log('[BrowserView] Set bounds:', { 
    x: 0, 
    y: NAV_HEIGHT, 
    width: bounds.width, 
    height: bounds.height - NAV_HEIGHT 
  });
}

// NEW: overlay window helpers
function updateOverlayBounds() {
  if (!mainWindow || !overlayWindow) return;
  const cb = mainWindow.getContentBounds();
  overlayWindow.setBounds({
    x: cb.x,
    y: cb.y + NAV_HEIGHT,
    width: cb.width,
    height: cb.height - NAV_HEIGHT
  });
}

function ensureOverlayWindow() {
  if (!mainWindow) return;
  if (overlayWindow && !overlayWindow.isDestroyed()) return;

  const preloadPath = path.join(__dirname, 'preload.js');
  const isDev = process.env.NODE_ENV === 'development';
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  overlayWindow = new BrowserWindow({
    parent: mainWindow,
    modal: false,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true,
    focusable: true, // interactive controls
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  // strongest always-on-top level
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true);

  // Load overlay page (dev/prod)
  if (isDev) {
    overlayWindow.loadURL(`${devUrl}/overlay.html`).catch(console.error);
  } else {
    const overlayHtml = path.join(__dirname, '../renderer/dist/overlay.html');
    overlayWindow.loadFile(overlayHtml).catch(console.error);
  }

  overlayWindow.once('ready-to-show', () => {
    updateOverlayBounds();
    overlayWindow?.showInactive(); // don't steal focus from main
  });
}

function showOverlayWindow() {
  if (!mainWindow) return;
  ensureOverlayWindow();
  if (!overlayWindow) return;
  updateOverlayBounds();
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.showInactive();
}

function hideOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
}

function destroyOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try { overlayWindow.hide(); } catch {}
    try { overlayWindow.close(); } catch {}
  }
  overlayWindow = null;
}

function ensureBrowserView() {
  if (!mainWindow) {
    console.error('[BrowserView] Main window not available');
    return;
  }
  if (settingsMode) {
    console.log('[BrowserView] Skipped creation (settings mode)');
    return;
  }
  if (activeView) {
    console.log('[BrowserView] Already exists, not repositioning during ensure');
    return; // Don't reposition if it already exists
  }
  
  console.log('[BrowserView] Creating new BrowserView');
  activeView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });
  
  // Don't attach it to window yet - let showBrowserView do that
  
  // Add event listeners for debugging
  activeView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[BrowserView] Failed to load:', validatedURL, 'Error:', errorCode, errorDescription);
  });
  
  activeView.webContents.on('did-finish-load', () => {
    const url = activeView?.webContents.getURL();
    console.log('[BrowserView] Page loaded successfully:', url);
  });
  
  console.log('[BrowserView] BrowserView created, ready for use');
}

function destroyBrowserView() {
  if (mainWindow && activeView) {
    try {
      console.log('[BrowserView] Destroying BrowserView');
      // Detach from window first
      mainWindow.setBrowserView(null);
      // Best-effort: remove listeners to allow GC
      try {
        activeView.webContents.removeAllListeners();
      } catch { /* ignore */ }
      // Note: BrowserView/WebContents do not expose a typed destroy(); allow GC by nulling reference
    } catch {
      /* ignore */
    }
    activeView = null;
  }
}

function hideBrowserView() {
  if (mainWindow && activeView) {
    console.log('[BrowserView] Hiding BrowserView');
    viewLocked = true;
    mainWindow.setBrowserView(null);
  }
}

function showBrowserView() {
  if (settingsMode) {
    console.log('[BrowserView] show requested while settings mode active - ignored');
    return;
  }
  if (mainWindow && activeView) {
    if (viewLocked) console.log('[BrowserView] Unlocking and showing BrowserView');
    else console.log('[BrowserView] Showing BrowserView');
    viewLocked = false;
    mainWindow.setBrowserView(activeView);
    resizeBrowserView();
    // REMOVED: showOverlayWindow(); // overlay removed to restore interaction
  } else if (mainWindow && !activeView) {
    ensureBrowserView();
    if (activeView) {
      viewLocked = false;
      mainWindow.setBrowserView(activeView);
      resizeBrowserView();
    }
  }
}

function normalizeUrl(raw: string): string | null {
  let v = (raw || '').trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try {
    const u = new URL(v);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : null;
  } catch {
    return null;
  }
}

function createWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('[Main] Preload path:', preloadPath);
  console.log('[Main] Preload exists:', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  console.log('[Main] Environment:', isDev ? 'Development' : 'Production');
  
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    console.log('[Main] Loading React dev server:', devUrl);
    mainWindow.loadURL(devUrl).catch(err => {
      console.error('[Main] Failed to load dev server:', err);
    });
  } else {
    // Production: load built React files
    const indexPath = path.join(__dirname, '../renderer/dist/index.html');
    console.log('[Main] Loading production build:', indexPath);
    console.log('[Main] Index.html exists:', fs.existsSync(indexPath));
    
    if (!fs.existsSync(indexPath)) {
      console.error('[Main] Production build not found! Run: cd renderer && npm run build');
    }
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('[Main] Failed to load production build:', err);
    });
  }

  // Wait for main window to finish loading before creating BrowserView
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[Main] Main window content loaded successfully');
    // Do not create/attach BrowserView here
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Main window failed to load:', errorCode, errorDescription);
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('resize', () => {
    resizeBrowserView();
    updateOverlayBounds();
  });

  mainWindow.on('move', () => {
    updateOverlayBounds();
  });

  mainWindow.on('focus', () => {
    // keep overlay above on refocus
    if (overlayWindow) showOverlayWindow();
  });

  mainWindow.on('show', () => {
    if (overlayWindow) showOverlayWindow();
  });

  mainWindow.on('hide', () => {
    if (overlayWindow) hideOverlayWindow();
  });

  mainWindow.on('minimize', () => {
    if (overlayWindow) hideOverlayWindow();
  });

  mainWindow.on('restore', () => {
    if (overlayWindow) showOverlayWindow();
  });

  mainWindow.on('closed', () => {
    destroyOverlayWindow();
    mainWindow = null;
    activeView = null;
  });
}

app.whenReady().then(() => {
  // Restrict CSP only to your app UI; do not apply to external sites loaded in BrowserView
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isAppUi = details.url.startsWith('http://localhost:5173') || details.url.startsWith('file:');
    if (!isAppUi) {
      callback({ responseHeaders: { ...details.responseHeaders } });
      return;
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' http: https: data: blob:;",
          "script-src 'self' 'unsafe-eval' http: https:;",
          "style-src 'self' 'unsafe-inline' http: https:;",
          "img-src 'self' data: blob: http: https:;",
          "font-src 'self' data: http: https:;",
          "connect-src 'self' ws: http: https:;"
        ].join(' ')
      }
    });
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* IPC CHANNELS */

// Settings mode control (hard hide/clear BrowserView)
ipcMain.handle('ui:enter-settings', () => {
  settingsMode = true;
  viewLocked = true;
  destroyBrowserView();
  hideOverlayWindow(); // harmless; overlay unused
  return { success: true };
});

ipcMain.handle('ui:exit-settings', () => {
  settingsMode = false;
  return { success: true };
});

// IPC: Overlay control
ipcMain.handle('overlay:ensure', () => {
  ensureOverlayWindow();
  showOverlayWindow();
  return { success: true };
});
ipcMain.handle('overlay:show', () => {
  showOverlayWindow();
  return { success: true };
});
ipcMain.handle('overlay:hide', () => {
  hideOverlayWindow();
  return { success: true };
});

// BrowserView Control
ipcMain.handle('browser:show-view', () => {
  ensureBrowserView();
  showBrowserView();
  return { success: true };
});

ipcMain.handle('browser:hide-view', () => {
  hideBrowserView();
  return { success: true };
});

// Navigation
ipcMain.handle('browser:navigate', async (_e, url: string) => {
  console.log('[Main] IPC browser:navigate called with:', url);
  if (!mainWindow) return { success: false, error: 'No main window' };
  // Create or reuse view but do not force show if settingsMode
  const view = await webViewManager.createOrReuseView(mainWindow);
  if (!view) {
    const err = settingsMode ? 'Settings open' : 'View unavailable';
    console.error('[Main]', err);
    return { success: false, error: err };
  }

  const normalized = normalizeUrl(url);
  if (!normalized) return { success: false, error: 'Invalid URL' };

  try {
    await webViewManager.loadUrl(view, normalized);
    if (!settingsMode && !viewLocked) {
      mainWindow.setBrowserView(view);
      webViewManager.adjustBoundsOnResize(mainWindow, view);
      // REMOVED overlay show
    }
    return { success: true, url: normalized };
  } catch (err) {
    console.error('[Main] navigation error', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('browser:go-back', () => {
  ensureBrowserView();
  if (activeView && activeView.webContents.canGoBack()) activeView.webContents.goBack();
  return { success: true };
});

ipcMain.handle('browser:go-forward', () => {
  ensureBrowserView();
  if (activeView && activeView.webContents.canGoForward()) activeView.webContents.goForward();
  return { success: true };
});

ipcMain.handle('browser:reload', () => {
  ensureBrowserView();
  if (activeView) activeView.webContents.reload();
  return { success: true };
});

// CSS Injection
ipcMain.handle('adapt:inject-css', async (_e, css: string) => {
  ensureBrowserView();
  if (!activeView) return { success: false, error: 'View not ready' };
  if (!css || css.length < 10) return { success: false, error: 'CSS too short' };

  const perform = async () => {
    try {
      await activeView!.webContents.insertCSS(css);
      return { success: true };
    } catch (err) {
      console.error('[inject-css] error:', err);
      return { success: false, error: 'CSS injection failed' };
    }
  };

  if (activeView.webContents.isLoadingMainFrame()) {
    return await new Promise(resolve => {
      activeView!.webContents.once('dom-ready', async () => resolve(await perform()));
    });
  }
  return perform();
});

// CSS Removal - Add this new handler
ipcMain.handle('adapt:remove-css', async (_e) => {
  ensureBrowserView();
  if (!activeView) return { success: false, error: 'View not ready' };
  
  try {
    // Note: Electron doesn't have a direct "remove all CSS" method
    // We'll need to reload the page or track inserted CSS keys
    console.log('[Main] CSS removal requested - reloading page to clear styles');
    await activeView.webContents.reload();
    return { success: true };
  } catch (err) {
    console.error('[Main] remove-css error:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('adapt:execute-js', async (_e, code: string) => {
  if (!activeView) return { success: false };
  if (code.length > 5000) return { success: false, error: 'Script too large' };
  try {
    const result = await activeView.webContents.executeJavaScript(code, true);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Profile
ipcMain.handle('profile:save', async (_e, profile: unknown) => {
  return saveProfile(profile);
});

ipcMain.handle('profile:load', async () => {
  const data = await loadProfile();
  return { success: true, data };
});

// Current URL
ipcMain.handle('browser:get-current-url', () => {
  if (!activeView) {
    console.log('[Main] get-current-url: no activeView');
    return null;
  }
  const url = activeView.webContents.getURL();
  console.log('[Main] get-current-url:', url);
  return url;
});

async function saveProfile(profile: unknown) {
  try {
    const dir = app.getPath('userData');
    const file = path.join(dir, 'profile.json');
    await fsp.writeFile(file, JSON.stringify(profile, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function loadProfile() {
  try {
    const file = path.join(app.getPath('userData'), 'profile.json');
    if (!fs.existsSync(file)) return null;
    const raw = await fsp.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* WebViewManager: creates/reuses BrowserView, loads URL, attaches listeners */
class WebViewManager {
  async createOrReuseView(win: BrowserWindow): Promise<BrowserView | null> {
    if (settingsMode) {
      console.log('[WebViewManager] settingsMode active - not creating view');
      return null;
    }
    if (activeView) {
      return activeView;
    }
    ensureBrowserView(); // existing helper now ensures activeView is created
    if (!activeView && mainWindow) {
      // fallback create
      activeView = new BrowserView({
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false,
          webSecurity: true
        }
      });
    }
    if (!activeView) return null;

    // Attach listeners
    activeView.webContents.once('dom-ready', () => {
      try {
        const url = activeView?.webContents.getURL();
        console.log('[WebViewManager] dom-ready:', url);
        win.webContents.send('view:dom-ready', { url });
      } catch (err) { /* ignore */ }
    });

    activeView.webContents.on('context-menu', async (_ev, params) => {
      try {
        await handleContextMenu(win, params);
      } catch (err) { console.error('[WebViewManager] context-menu error', err); }
    });

    return activeView;
  }

  async loadUrl(view: BrowserView, url: string): Promise<void> {
    if (!view) return;
    await view.webContents.loadURL(url);
    // Inject adaptation agent (graceful)
    try {
      await view.webContents.executeJavaScript(adaptationAgentScript, true);
      console.log('[WebViewManager] adaptation script injected');
    } catch (err) {
      console.warn('[WebViewManager] adaptation injection failed', err);
    }
  }

  adjustBoundsOnResize(win: BrowserWindow, view: BrowserView) {
    if (!win || !view) return;
    const bounds = win.getBounds();
    view.setBounds({ x: 0, y: NAV_HEIGHT, width: bounds.width, height: bounds.height - NAV_HEIGHT });
    view.setAutoResize({ width: true, height: true });
    // Keep overlay synced too
    updateOverlayBounds();
  }
}

const webViewManager = new WebViewManager();

/* Context menu helpers and simple pipeline stubs */
async function summarizeText(text: string): Promise<string> {
  // Placeholder: replace with real model invocation
  const short = text.trim().slice(0, 400);
  return `Summary: ${short}${text.length > 400 ? '…' : ''}`;
}

async function generateCaptionForImage(params: any): Promise<string> {
  // Placeholder: in a real app, get the image src or binary and call model
  return 'Generated caption: A decorative image';
}

async function readAloudText(text: string): Promise<string> {
  // Placeholder: send TTS command to renderer or TTS backend
  return 'Read aloud started';
}

/**
 * Build and show a context menu based on params, then handle actions.
 */
async function handleContextMenu(win: BrowserWindow, params: Electron.ContextMenuParams) {
  const template: Electron.MenuItemConstructorOptions[] = [];

  if (params.selectionText && params.selectionText.trim().length > 0) {
    const selected = params.selectionText.trim();
    template.push({
      label: 'Summarize Selected Text',
      click: async () => {
        const summary = await summarizeText(selected);
        win.webContents.send('show-summary', { summary, source: 'selection' });
      }
    });
    template.push({
      label: 'Read Aloud',
      click: async () => {
        await readAloudText(selected);
        win.webContents.send('tts-started', { text: selected });
      }
    });
  }

  if (params.mediaType === 'image' || (params.srcURL && params.srcURL.length)) {
    template.push({
      label: 'Generate Caption for Image',
      click: async () => {
        const caption = await generateCaptionForImage(params);
        win.webContents.send('show-summary', { summary: caption, source: 'image' });
      }
    });
  }

  if (template.length === 0) {
    template.push({ role: 'copy' }, { role: 'paste' });
  }

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: win });
}

// Listen for window resize to adjust active view bounds
app.on('browser-window-created', (_ev, win) => {
  win.on('resize', () => {
    if (activeView) {
      webViewManager.adjustBoundsOnResize(win, activeView);
    }
  });
});
