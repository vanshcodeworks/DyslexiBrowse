import { app, BrowserWindow, ipcMain, session, BrowserView } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as fsp from 'fs/promises';

let mainWindow: BrowserWindow | null = null;
let activeView: BrowserView | null = null;
let viewLocked = false; // lock while settings/onboarding is open
let settingsMode = false; // NEW: when true, never attach or create BrowserView

function resizeBrowserView() {
  if (!mainWindow || !activeView) return;
  const bounds = mainWindow.getContentBounds();
  console.log('[BrowserView] Window bounds:', bounds);
  
  // Reserve space for React navigation bar (approximately 90px total)
  const navHeight = 90;
  activeView.setBounds({ 
    x: 0, 
    y: navHeight, 
    width: bounds.width, 
    height: bounds.height - navHeight 
  });
  
  console.log('[BrowserView] Set bounds:', { 
    x: 0, 
    y: navHeight, 
    width: bounds.width, 
    height: bounds.height - navHeight 
  });
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
  });

  mainWindow.on('closed', () => {
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
  return { success: true };
});

ipcMain.handle('ui:exit-settings', () => {
  settingsMode = false;
  // Do not create/attach automatically; renderer may call showBrowserView/navigate
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
  ensureBrowserView();
  if (!activeView) {
    const error = settingsMode ? 'Settings open' : 'Browser view failed to initialize';
    console.error('[Main]', error);
    return { success: false, error };
  }

  const normalized = normalizeUrl(url);
  if (!normalized) {
    const error = `Invalid URL format: "${url}"`;
    console.error('[Main]', error);
    return { success: false, error };
  }

  console.log('[Main] Normalized URL:', normalized);

  // Do NOT force show here; allow navigation while hidden if locked
  return new Promise((resolve) => {
    if (!activeView) {
      resolve({ success: false, error: 'View disappeared' });
      return;
    }

    const onFinish = () => {
      cleanup();
      const finalUrl = activeView?.webContents.getURL() || normalized;
      console.log('[Main] Navigation successful:', finalUrl);
      resolve({ success: true, url: finalUrl });
    };

    const onFail = (_event: any, errorCode: number, errorDescription: string, validatedURL: string) => {
      cleanup();
      console.error('[Main] Navigation failed:', errorCode, errorDescription, validatedURL);
      resolve({
        success: false,
        error: `Failed to load: ${errorDescription} (${errorCode})`
      });
    };

    const cleanup = () => {
      activeView?.webContents.off('did-finish-load', onFinish);
      activeView?.webContents.off('did-fail-load', onFail);
    };

    activeView.webContents.once('did-finish-load', onFinish);
    activeView.webContents.once('did-fail-load', onFail);

    activeView.webContents.loadURL(normalized).catch((err) => {
      cleanup();
      console.error('[Main] loadURL threw error:', err);
      resolve({ success: false, error: String(err) });
    });

    setTimeout(() => {
      cleanup();
      resolve({ success: false, error: 'Navigation timeout' });
    }, 30000);
  });
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
