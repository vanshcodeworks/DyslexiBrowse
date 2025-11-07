import { useState, useEffect } from 'react';
import type { DyslexiaProfile } from './types/dyslexia';
import { AdaptationEngine } from './utils/adaptationEngine';
import Onboarding from './components/Onboarding';
import './App.css';

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

  const toggleAdaptation = async () => {
    if (!profile) {
      setShowOnboarding(true);
      return;
    }

    if (adaptationEnabled) {
      // Disable adaptations
      setAdaptationEnabled(false);
      await adaptationEngine.removeAdaptations();
    } else {
      // Enable adaptations
      setAdaptationEnabled(true);
      await applyAdaptations();
    }
  };

  const toggleSettings = async () => {
    // Enter strict settings mode: destroys BrowserView
    await window.api?.enterSettings();
    setShowOnboarding(true);
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

  // Show onboarding if no profile
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      userSelect: 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        height: 60,
        boxSizing: 'border-box'
      }}>
        {/* Navigation Controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={goBack} 
            title="Go Back" 
            style={{ 
              fontSize: '18px', 
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: '600'
            }}
          >
            ◀
          </button>
          <button 
            onClick={goForward} 
            title="Go Forward" 
            style={{ 
              fontSize: '18px', 
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: '600'
            }}
          >
            ▶
          </button>
          <button 
            onClick={reload} 
            title="Reload Page" 
            style={{ 
              fontSize: '18px', 
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: '600'
            }}
          >
            ⟳
          </button>
        </div>

        {/* URL Bar */}
        <input
          style={{
            flex: 1,
            padding: '10px 16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'rgba(255,255,255,0.95)',
            color: '#333',
            outline: 'none',
            transition: 'all 0.2s',
            fontWeight: '500'
          }}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate(); }}
          placeholder="Enter website URL (e.g., google.com, youtube.com)"
          spellCheck={false}
        />

        {/* Go Button */}
        <button 
          onClick={navigate} 
          style={{ 
            padding: '10px 20px', 
            fontWeight: '700',
            fontSize: '14px',
            background: 'rgba(255,255,255,0.95)',
            color: '#667eea',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          Go
        </button>

        {/* Adaptation Toggle */}
        <button
          onClick={toggleAdaptation}
          disabled={isApplying}
          title={adaptationEnabled ? 'Disable dyslexia adaptations' : 'Enable dyslexia adaptations'}
          style={{
            background: adaptationEnabled 
              ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)' 
              : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
            color: '#fff',
            padding: '10px 18px',
            border: 'none',
            borderRadius: '8px',
            cursor: isApplying ? 'wait' : 'pointer',
            opacity: isApplying ? 0.7 : 1,
            fontWeight: '700',
            fontSize: '13px',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            minWidth: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {isApplying ? (
            <>⏳ Applying...</>
          ) : adaptationEnabled ? (
            <>✓ Adapted</>
          ) : (
            <>🔧 Enable</>
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={toggleSettings}
          title="Retake assessment or change settings"
          style={{
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ⚙️
        </button>
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '8px 16px',
        fontSize: '12px',
        background: error ? '#ffebee' : '#f5f7fa',
        borderBottom: '1px solid #e1e8ed',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        minHeight: 36,
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
  );
}

export default App;
