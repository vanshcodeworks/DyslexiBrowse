import { useState, useEffect } from 'react';
import type { DyslexiaProfile } from './types/dyslexia';
import { AdaptationEngine } from './utils/adaptationEngine';
import Onboarding from './components/Onboarding';
import './App.css';

const NAV_HEIGHT = 110; // Align with BrowserView top offset

function App() {
  // Navigation
  const [address, setAddress] = useState('https://example.com');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Adaptation state
  const [profile, setProfile] = useState<DyslexiaProfile | null>(null);
  const [adaptationEnabled, setAdaptationEnabled] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);

  // Assistive tool state (ensure these exist)
  const API_BASE = 'http://127.0.0.1:5000';
  const [sumInput, setSumInput] = useState('');
  const [sumOutput, setSumOutput] = useState('');
  const [sumLoading, setSumLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsUrl, setTtsUrl] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState('');
  const [imgCaption, setImgCaption] = useState('');
  const [imgLoading, setImgLoading] = useState(false);

  const [pageSummary, setPageSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [lastSelection, setLastSelection] = useState('');
  const [autoTTSLock, setAutoTTSLock] = useState(false);
  const [lastHoveredImg, setLastHoveredImg] = useState('');
  const [autoCaptionLoading, setAutoCaptionLoading] = useState(false);

  // NEW tooltip states
  const [hoverCaption, setHoverCaption] = useState<{ text: string; x: number; y: number; visible: boolean }>({
    text: '', x: 0, y: 0, visible: false
  });
  const [selectionSummary, setSelectionSummary] = useState<{ text: string; x: number; y: number; visible: boolean; loading: boolean }>({
    text: '', x: 0, y: 0, visible: false, loading: false
  });
  const [selectionSummaryLock, setSelectionSummaryLock] = useState(false);

  const adaptationEngine = new AdaptationEngine();

  // Check for existing profile on mount
  useEffect(() => {
    let mounted = true;
    let pollInterval: number;

    (async () => {
      try {
        if (!window.api) {
          setError('Browser API not available');
          return;
        }

        // Load saved profile
        const result = await window.api.loadProfile();
        if (mounted && result?.success && result.data) {
          setProfile(result.data as DyslexiaProfile);
          console.log('[App] Loaded saved profile:', result.data);
          
          // Show browser view since we have a profile
          await window.api.showBrowserView();
        } else if (mounted) {
          // No profile found - hide browser view and show onboarding
          await window.api.hideBrowserView();
          setShowOnboarding(true);
          return; // Don't start navigation or polling
        }

        // Get initial URL (only if not showing onboarding)
        const url = await window.api.getCurrentURL();
        if (mounted) {
          if (url && !url.startsWith('data:')) {
            setCurrent(url);
            setAddress(url);
          } else {
            // Navigate to default page
            const res = await window.api.navigate(address);
            if (res?.success && res.url) {
              setCurrent(res.url);
            }
          }
        }
      } catch (err) {
        console.error('[App] Initialization error:', err);
      }
    })();

    // Poll for URL changes (reduced frequency to avoid spam)
    pollInterval = window.setInterval(async () => {
      if (!mounted || !window.api || showOnboarding) return;
      
      try {
        const url = await window.api.getCurrentURL();
        if (url && !url.startsWith('data:')) {
          setCurrent(prevCurrent => {
            if (url !== prevCurrent) {
              console.log('[App] URL changed to:', url);
              
              // Re-apply adaptations if enabled
              if (adaptationEnabled && profile) {
                setTimeout(() => applyAdaptations(), 300);
              }
              return url;
            }
            return prevCurrent;
          });
        }
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [showOnboarding]); // Add showOnboarding to dependencies

  const toggleAdaptation = async () => {
    if (!profile) {
      setShowOnboarding(true);
      return;
    }

    if (adaptationEnabled) {
      // Disable adaptations
      setAdaptationEnabled(false);
      await adaptationEngine.removeAdaptations();
      setShowSidePanel(false);
    } else {
      // Enable adaptations
      setAdaptationEnabled(true);
      await applyAdaptations();
      // side panel remains user‑controlled
    }
  };

  const toggleSidePanel = () => {
    if (!adaptationEnabled) return;
    setShowSidePanel(prev => !prev);
  };

  // NEW: open settings (onboarding) and hide side panel
  const toggleSettings = async () => {
    await window.api?.enterSettings();
    setShowSidePanel(false);
    setShowOnboarding(true);
  };

  const handleSettingChange = async (partial: {
    fontSize?: number;
    lineHeight?: number;
    letterSpacing?: number;
    wordSpacing?: number;
    bionicReading?: boolean;
    focusMode?: boolean; // NEW
  }) => {
    const dynamic = {
      fontSize: partial.fontSize ?? currentDynamic.fontSize,
      lineHeight: partial.lineHeight ?? currentDynamic.lineHeight,
      letterSpacing: partial.letterSpacing ?? currentDynamic.letterSpacing,
      wordSpacing: partial.wordSpacing ?? currentDynamic.wordSpacing,
      bionicReading: partial.bionicReading ?? currentDynamic.bionicReading,
      focusMode: partial.focusMode ?? currentDynamic.focusMode, // NEW
    };
    setCurrentDynamic(dynamic);
    await adaptationEngine.applyDynamicSettings(dynamic);
  };

  const [currentDynamic, setCurrentDynamic] = useState({
    fontSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0.05,
    wordSpacing: 0.1,
    bionicReading: false,
    focusMode: false, // NEW
  });

  // Ensure overlay window exists after app load
  useEffect(() => {
    // Removed overlayEnsure
  }, []);

  // ===== KEEP ONLY ONE SET OF HELPERS BELOW – DELETE DUPLICATES LATER IN FILE =====

  // Helper to unwrap ipc result safely
  const unwrap = (r: any) => (r && typeof r === 'object' && 'result' in r ? (r as any).result : r) ?? {};

  // Navigation function
  const navigate = async () => {
    setError(null);
    if (!window.api) {
      setError('Browser API not available');
      return;
    }

    const url = normalizeInput(address);
    if (!url) {
      setError('Invalid URL');
      return;
    }

    try {
      const res = await window.api.navigate(url);
      if (res?.success && res.url) {
        setCurrent(res.url);
        setAddress(res.url);
        setError(null);
        
        // Apply adaptations to new page if enabled
        if (adaptationEnabled && profile) {
          setTimeout(() => applyAdaptations(), 500);
        }
      } else {
        setError(res?.error || 'Navigation failed');
      }
    } catch (e) {
      setError(`Navigation error: ${String(e)}`);
    }
  };

  // Apply adaptations based on profile
  const applyAdaptations = async () => {
    if (!profile) return;
    
    setIsApplying(true);
    try {
      await adaptationEngine.applyAdaptations(profile);
      console.log('[App] Adaptations applied');
    } catch (err) {
      console.error('[App] Adaptation error:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleOnboardingComplete = async (newProfile: DyslexiaProfile | null) => {
    setShowOnboarding(false);

    // Exit settings mode (BrowserView can be created/shown again)
    await window.api?.exitSettings();

    if (newProfile) {
      setProfile(newProfile);
      if (window.api) await window.api.saveProfile(newProfile);
      setAdaptationEnabled(true);
      setTimeout(() => applyAdaptations(), 300);
    }

    // Recreate/show the BrowserView and navigate back if needed
    await window.api?.showBrowserView();
    const url = await window.api?.getCurrentURL();
    if (!url || url.startsWith('data:')) {
      const res = await window.api?.navigate(address);
      if (res?.success && res.url) setCurrent(res.url);
    }
  };

  const normalizeInput = (raw: string): string | null => {
    let v = raw.trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
      const u = new URL(v);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
      return null;
    } catch {
      return null;
    }
  };

  const goBack = () => window.api?.goBack();
  const goForward = () => window.api?.goForward();
  const reload = () => window.api?.reload();
  const retryNavigation = () => {
    setError(null);
    navigate();
  };

  // Chrome-like UI helpers
  const isSecure = current?.startsWith('https://');
  const faviconSrc = current ? `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(current)}` : '';

  // Helpers to get text from BrowserView
  const getSelectedText = async (): Promise<string> => {
    try {
      const r = await window.api?.runScript("((window.getSelection && window.getSelection().toString())||'').trim()");
      return (r && (r as any).result !== undefined ? (r as any).result : r) || '';
    } catch { return ''; }
  };
  const getPageText = async (maxChars = 6000): Promise<string> => {
    try {
      const r = await window.api?.runScript(`
        (function(){
          try {
            var t=(document.body&&document.body.innerText)||'';
            return t.replace(/\\s+/g,' ').trim().slice(0,${maxChars});
          } catch(e){return '';}
        })()
      `);
      return (r && (r as any).result !== undefined ? (r as any).result : r) || '';
    } catch { return ''; }
  };

  // Summarization core
  const summarize = async (text: string) => {
    if (!text) return;
    setSumLoading(true);
    setSumOutput('');
    try {
      const resp = await fetch(`${API_BASE}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const json = await resp.json();
      setSumOutput(json.summary || json.error || 'No summary.');
    } catch (e: any) {
      setSumOutput('Summarization failed: ' + String(e));
    } finally {
      setSumLoading(false);
    }
  };
  const summarizeSelection = async () => summarize(await getSelectedText());
  const summarizePage = async () => summarize(await getPageText());

  // TTS for selection
  const ttsSelection = async () => {
    setTtsLoading(true);
    setTtsUrl(null);
    try {
      const text = await getSelectedText();
      if (!text) { setTtsLoading(false); return; }
      const resp = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const blob = await resp.blob();
      setTtsUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error('TTS error', e);
    } finally {
      setTtsLoading(false);
    }
  };

  // Image caption from URL
  const captionFromUrl = async () => {
    if (!imgUrl) return;
    setImgLoading(true);
    setImgCaption('');
    try {
      const resp = await fetch(`${API_BASE}/caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imgUrl })
      });
      const json = await resp.json();
      setImgCaption(json.caption || json.error || 'No caption.');
    } catch (e: any) {
      setImgCaption('Caption failed: ' + String(e));
    } finally {
      setImgLoading(false);
    }
  };

  // Helper: fetch page text and summarize
  const fetchAndSummarizePage = async () => {
    if (!adaptationEnabled) return;
    setSummaryLoading(true);
    try {
      const pageTextRes = await window.api?.runScript(`
        (function(){
          try {
            var t=(document.body&&document.body.innerText)||'';
            return t.replace(/\\s+/g,' ').trim().slice(0,8000);
          }catch(e){return '';}
        })()
      `);
      const txt = (pageTextRes && (pageTextRes as any).result !== undefined ? (pageTextRes as any).result : pageTextRes) || '';
      if (!txt) { setPageSummary(''); setSummaryLoading(false); return; }
      const r = await fetch('http://127.0.0.1:5000/summarize', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ text: txt })
      });
      const j = await r.json();
      setPageSummary(j.summary || j.error || '');
    } catch (e:any) {
      setPageSummary('Summary failed: ' + String(e));
    } finally {
      setSummaryLoading(false);
    }
  };

  // Auto summary on URL change
  useEffect(() => {
    if (adaptationEnabled && current) {
      fetchAndSummarizePage();
    }
  }, [current, adaptationEnabled]);

  // Poll selection & auto TTS
  useEffect(() => {
    if (!adaptationEnabled) return;
    const interval = setInterval(async () => {
      try {
        const selRes = await window.api?.runScript("((window.getSelection && window.getSelection().toString())||'').trim()");
        const sel = (selRes && (selRes as any).result !== undefined ? (selRes as any).result : selRes) || '';
        if (sel && sel.length > 3 && sel.length < 1200 && sel !== lastSelection && !autoTTSLock) {
          setLastSelection(sel);
          setAutoTTSLock(true);
          const resp = await fetch('http://127.0.0.1:5000/tts', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ text: sel })
          });
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          setTtsUrl(url);
        }
        if (!sel) setLastSelection('');
      } catch {}
    }, 900);
    return () => clearInterval(interval);
  }, [adaptationEnabled, lastSelection, autoTTSLock]);

  useEffect(() => {
    if (!ttsUrl) { setAutoTTSLock(false); }
  }, [ttsUrl]);

  // UPDATE image hover polling: include rect & tooltip display
  useEffect(() => {
    if (!adaptationEnabled) return;
    const interval = setInterval(async () => {
      try {
        const pageData = await window.api?.runScript(`
          (function(){
            try {
              var chain = Array.from(document.querySelectorAll(':hover'));
              var img = chain.reverse().find(e=>e.tagName==='IMG');
              if(!img) return { src:'', rect:null };
              var r = img.getBoundingClientRect();
              return { src: img.src||'', rect:{ left:r.left, top:r.top, width:r.width, height:r.height } };
            }catch(e){ return { src:'', rect:null }; }
          })()
        `);
        const pd: any = unwrap(pageData);
        const src: string = pd?.src || '';
        const rect: { left: number; top: number; width: number; height: number } | null = pd?.rect || null;

        if (src && rect && src !== lastHoveredImg && !autoCaptionLoading) {
          setLastHoveredImg(src);
          setAutoCaptionLoading(true);
          setHoverCaption({
            text: 'Captioning…',
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            visible: true
          });
          try {
            const r = await fetch('http://127.0.0.1:5000/caption', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: src })
            });
            const j = await r.json();
            setHoverCaption({
              text: j.caption || j.error || 'No caption.',
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
              visible: true
            });
          } catch {
            setHoverCaption({
              text: 'Caption failed',
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
              visible: true
            });
          } finally {
            setAutoCaptionLoading(false);
          }
        } else if (!src) {
          // hide when not hovering image
          setHoverCaption(prev => prev.visible ? { ...prev, visible: false } : prev);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [adaptationEnabled, lastHoveredImg, autoCaptionLoading]);

  // NEW selection summary polling (independent from auto TTS)
  useEffect(() => {
    if (!adaptationEnabled) return;
    const interval = setInterval(async () => {
      if (selectionSummaryLock) return;
      try {
        const selData = await window.api?.runScript(`
          (function(){
            try {
              var sel = window.getSelection();
              if(!sel || !sel.rangeCount) return { text:'', rect:null };
              var txt = sel.toString().trim();
              if(!txt) return { text:'', rect:null };
              var r = sel.getRangeAt(0).getBoundingClientRect();
              return { text: txt, rect: { left:r.left, top:r.top, width:r.width, height:r.height } };
            }catch(e){ return { text:'', rect:null }; }
          })()
        `);
        const sd: any = unwrap(selData);
        const txt: string = sd?.text || '';
        const rect: { left: number; top: number; width: number; height: number } | null = sd?.rect || null;

        if (txt && rect && txt !== lastSelection) {
          // trigger summary
          setSelectionSummary({
            text: 'Summarizing…',
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            visible: true,
            loading: true
          });
          setSelectionSummaryLock(true);
          try {
            const resp = await fetch('http://127.0.0.1:5000/summarize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: txt.slice(0, 4000) })
            });
            const j = await resp.json();
            setSelectionSummary({
              text: j.summary || j.error || 'No summary.',
              x: rect.left + rect.width / 2,
              y: rect.top - 10,
              visible: true,
              loading: false
            });
            setLastSelection(txt);
          } catch {
            setSelectionSummary(prev => ({ ...prev, text: 'Summary failed', loading: false }));
          } finally {
            // unlock after short debounce to allow new selection
            setTimeout(() => setSelectionSummaryLock(false), 2000);
          }
        } else if (!txt) {
          // hide tooltip if selection cleared
          if (selectionSummary.visible) {
            setSelectionSummary(prev => ({ ...prev, visible: false }));
          }
        }
      } catch {}
    }, 1200);
    return () => clearInterval(interval);
  }, [adaptationEnabled, lastSelection, selectionSummaryLock]);

  // Show onboarding if no profile
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif', 
        userSelect: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        backgroundColor: '#f1f3f4',
        boxShadow: 'none'
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          padding: '10px 14px', // increased from 8px 10px
          background: '#f1f3f4',
          height: 70, // increased from 60
          boxSizing: 'border-box',
          borderBottom: '1px solid #dadce0'
        }}>
          {/* Navigation Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="toolbar-btn" onClick={goBack} title="Back" style={{ fontSize: 18, padding: '8px 14px' }}>⟵</button>
            <button className="toolbar-btn" onClick={goForward} title="Forward" style={{ fontSize: 18, padding: '8px 14px' }}>⟶</button>
            <button className="toolbar-btn" onClick={reload} title="Reload" style={{ fontSize: 18, padding: '8px 14px' }}>⟳</button>
          </div>

          {/* URL Bar */}
          <div className="url-pill" style={{ padding: '4px 12px' }}>
            <span title={isSecure ? 'Secure connection' : 'Not secure'} style={{ fontSize: 16 }}>
              {isSecure ? '🔒' : '⚠️'}
            </span>
            <img
              src={faviconSrc}
              alt=""
              width={20}
              height={20}
              style={{ borderRadius: 4, display: faviconSrc ? 'block' : 'none' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <input
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 16,
                padding: '10px 8px',
                background: 'transparent',
                color: '#1f1f1f',
                // Removed OpenDyslexic from app UI
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
              }}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(); }}
            />
            <button onClick={navigate} style={{ padding: '8px 14px', fontSize: 14 }}>Go</button>
          </div>

          {/* Adaptation Toggle */}
          <button
            onClick={toggleAdaptation}
            disabled={isApplying}
            className="adapt-toggle"
            style={{
              background: adaptationEnabled
                ? 'linear-gradient(90deg,#34a853,#0d8f42)'
                : 'linear-gradient(90deg,#1a73e8,#1558b0)',
              padding: '12px 22px',
              fontSize: 14,
              minWidth: 140
            }}
          >
            {isApplying ? 'Applying…' : (adaptationEnabled ? '✓ Adapted' : 'Enable')}
          </button>

          {/* Side Panel Toggle (appears when adapted) */}
          <button
            onClick={toggleSidePanel}
            className="toolbar-btn"
            title="Show reading controls"
            style={{
              fontSize: 16,
              padding: '8px 14px',
              opacity: adaptationEnabled ? 1 : 0.4,
              cursor: adaptationEnabled ? 'pointer' : 'not-allowed'
            }}
          >
            {showSidePanel ? '✖ Controls' : '⚙ Controls'}
          </button>

          {/* Settings */}
          <button
            className="toolbar-btn"
            onClick={toggleSettings}
            title="Settings / Assessment"
            style={{ fontSize: 20, padding: '8px 14px' }}
          >
            🧪
          </button>
        </div>

        {/* Status Bar */}
        <div style={{
          padding: '8px 14px', // increased from 6px 12px
          fontSize: 13, // increased from 12
          background: error ? '#fdecea' : '#ffffff',
          borderBottom: '1px solid #e1e8ed',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          minHeight: 40, // increased from 36
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              color: '#555',
              fontWeight: '500'
            }}>
              <span style={{ fontSize: '14px' }}>🌐</span>
              {current || 'No page loaded'}
            </span>
            {profile && (
              <span style={{
                padding: '2px 8px',
                background: adaptationEnabled ? '#4caf5020' : '#66666620',
                color: adaptationEnabled ? '#4caf50' : '#666',
                borderRadius: 4,
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}>
                {profile.profile} Profile
              </span>
            )}
            {adaptationEnabled && !error && (
              <span style={{ 
                color: '#4caf50',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span>✓</span> Dyslexia Mode Active
              </span>
            )}
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#d32f2f', fontWeight: '500' }}>❌ {error}</span>
              <button 
                onClick={retryNavigation}
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  background: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Retry
              </button>
            </div>
          )}
          <div style={{ 
            fontSize: '11px', 
            color: window.api ? '#4caf50' : '#d32f2f',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{ fontSize: '8px' }}>●</span>
            {window.api ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Side Panel (non-blocking overlay) */}
      {showSidePanel && adaptationEnabled && (
        <div
          style={{
            position: 'fixed',
            top: 70,
            right: 0,
            bottom: 0,
            width: 360,              // widened a bit
            pointerEvents: 'none',
            zIndex: 10001
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
              height: '100%',
              background: '#ffffffee',
              backdropFilter: 'blur(4px)',
              borderLeft: '1px solid #dadce0',
              boxShadow: '-4px 0 12px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
            }}
          >
            {/* Header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid #e5e7ea',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: 14
            }}>
              <span>Reading Controls</span>
              <button onClick={() => setShowSidePanel(false)} className="toolbar-btn" style={{ padding: '4px 10px', fontSize: 12 }}>Close</button>
            </div>

            {/* Controls */}
            <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1 }}>
              {/* Sliders */}
              <ControlSlider
                label="Font Size"
                unit="px"
                min={12}
                max={32}
                value={currentDynamic.fontSize}
                onChange={(v) => handleSettingChange({ fontSize: v })}
              />
              <ControlSlider
                label="Line Height"
                unit=""
                step={0.1}
                min={1.0}
                max={3.0}
                value={currentDynamic.lineHeight}
                onChange={(v) => handleSettingChange({ lineHeight: v })}
              />
              <ControlSlider
                label="Letter Spacing"
                unit="em"
                step={0.01}
                min={0}
                max={0.3}
                value={currentDynamic.letterSpacing}
                onChange={(v) => handleSettingChange({ letterSpacing: v })}
              />
              <ControlSlider
                label="Word Spacing"
                unit="em"
                step={0.01}
                min={0}
                max={0.5}
                value={currentDynamic.wordSpacing}
                onChange={(v) => handleSettingChange({ wordSpacing: v })}
              />

              {/* Bionic Reading */}
              <div style={{ marginTop: 18 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={currentDynamic.bionicReading}
                    onChange={(e) => handleSettingChange({ bionicReading: e.target.checked })}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Bionic Reading (bold starts)</span>
                </label>
              </div>

              {/* Focus Mode - show hovered word */}
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={currentDynamic.focusMode}
                    onChange={(e) => handleSettingChange({ focusMode: e.target.checked })}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Focus Mode (hover shows word)</span>
                </label>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#e5e7ea', margin: '12px 0' }} />

              {/* Assistive Tools */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#2C3E50', marginBottom: 8 }}>Assistive Tools</div>

              {/* Summarize Row */}
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="toolbar-btn" onClick={summarizeSelection} style={{ flex: 1 }}>Summarize Selection</button>
                  <button className="toolbar-btn" onClick={summarizePage} style={{ flex: 1 }}>Summarize Page</button>
                </div>
                <textarea
                  value={sumInput}
                  onChange={(e) => setSumInput(e.target.value)}
                  placeholder="Paste text to summarize…"
                  style={{ width: '100%', minHeight: 70, padding: 8, border: '1px solid #dadce0', borderRadius: 8, fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="toolbar-btn" onClick={() => summarize(sumInput)} disabled={sumLoading} style={{ flex: 1 }}>
                    {sumLoading ? 'Summarizing…' : 'Summarize Text'}
                  </button>
                  <button
                    className="toolbar-btn"
                    onClick={() => { if (sumOutput) navigator.clipboard.writeText(sumOutput); }}
                    disabled={!sumOutput}
                  >
                    Copy
                  </button>
                </div>
                {sumOutput && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e5e7ea',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 13,
                    color: '#2e3134',
                    lineHeight: 1.55
                  }}>
                    {sumOutput}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#e5e7ea', margin: '12px 0' }} />

              {/* TTS (Server) */}
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="toolbar-btn" onClick={ttsSelection} disabled={ttsLoading} style={{ flex: 1 }}>
                    {ttsLoading ? 'Preparing audio…' : 'Read Selection (Server TTS)'}
                  </button>
                  <button className="toolbar-btn" onClick={() => { if (ttsUrl) URL.revokeObjectURL(ttsUrl); setTtsUrl(null); }}>
                    Stop
                  </button>
                </div>
                {ttsUrl && (
                  <audio controls autoPlay style={{ width: '100%' }}>
                    <source src={ttsUrl} type="audio/mpeg" />
                  </audio>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#e5e7ea', margin: '12px 0' }} />

              {/* Image Caption from URL */}
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  placeholder="Paste image URL to caption…"
                  style={{ width: '100%', padding: 8, border: '1px solid #dadce0', borderRadius: 8, fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="toolbar-btn" onClick={captionFromUrl} disabled={imgLoading} style={{ flex: 1 }}>
                    {imgLoading ? 'Captioning…' : 'Caption Image'}
                  </button>
                  <button
                    className="toolbar-btn"
                    onClick={() => { if (imgCaption) navigator.clipboard.writeText(imgCaption); }}
                    disabled={!imgCaption}
                  >
                    Copy
                  </button>
                </div>
                {imgCaption && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e5e7ea',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 13,
                    color: '#2e3134',
                    lineHeight: 1.55
                  }}>
                    {imgCaption}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#e5e7ea', margin: '12px 0' }} />

              {/* Auto Page Summary */}
              <div style={{ marginTop:18 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#2C3E50', marginBottom:6 }}>Page Summary (auto)</div>
                <div style={{
                  minHeight:60,
                  background:'#f8fafc',
                  border:'1px solid #e5e7ea',
                  borderRadius:8,
                  padding:10,
                  fontSize:13,
                  lineHeight:1.55,
                  color:'#2e3134'
                }}>
                  {summaryLoading ? 'Generating summary…' : (pageSummary || 'No summary yet.')}
                </div>
              </div>

              {/* Auto Selection TTS */}
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#2C3E50', marginBottom:6 }}>Selection Audio (auto)</div>
                {ttsUrl ? (
                  <audio
                    controls
                    autoPlay
                    onEnded={() => { setTtsUrl(null); setAutoTTSLock(false); }}
                    style={{ width:'100%' }}
                  >
                    <source src={ttsUrl} type="audio/mpeg" />
                  </audio>
                ) : (
                  <div style={{ fontSize:12, color:'#555' }}>Select text on the page to hear it.</div>
                )}
              </div>

              {/* Auto Image Caption */}
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#2C3E50', marginBottom:6 }}>
                  Hover Image Caption (auto)
                </div>
                <div style={{
                  minHeight:50,
                  background:'#f8fafc',
                  border:'1px solid #e5e7ea',
                  borderRadius:8,
                  padding:10,
                  fontSize:13,
                  lineHeight:1.5,
                  color:'#2e3134'
                }}>
                  {autoCaptionLoading ? 'Captioning…' : (imgCaption || 'Hover an image to caption it.')}
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', fontSize: 11, color: '#555' }}>
              Calls: {API_BASE}. Keep this panel open to access tools quickly.
            </div>
          </div>
        </div>
      )}

      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* TOOLTIP OVERLAYS */}
      {adaptationEnabled && (
        <>
          {hoverCaption.visible && (
            <div
              style={{
                position: 'fixed',
                left: hoverCaption.x,
                top: hoverCaption.y + NAV_HEIGHT, // adjust for toolbar
                transform: 'translate(-50%,-100%)',
                background: '#111',
                color: '#fff',
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                maxWidth: 240,
                lineHeight: 1.4,
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                zIndex: 10002,
                pointerEvents: 'none'
              }}
            >
              {hoverCaption.text}
            </div>
          )}
          {selectionSummary.visible && (
            <div
              style={{
                position: 'fixed',
                left: selectionSummary.x,
                top: selectionSummary.y + NAV_HEIGHT,
                transform: 'translate(-50%,-100%)',
                background: selectionSummary.loading ? '#004a99' : '#222',
                color: '#fff',
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 10,
                maxWidth: 320,
                lineHeight: 1.5,
                boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
                zIndex: 10002,
                pointerEvents: 'none'
              }}
            >
              {selectionSummary.text}
            </div>
          )}
        </>
      )}
    </>
  );
}

// Small slider component
const ControlSlider = ({
  label, unit, value, onChange, min, max, step
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 6,
      fontSize: 12,
      fontWeight: 600,
      color: '#333'
    }}>
      <span>{label}</span>
      <span style={{ color: '#1a73e8' }}>{value.toFixed(step ? 2 : 0)}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step || 1}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: '100%' }}
    />
  </div>
);

export default App;
