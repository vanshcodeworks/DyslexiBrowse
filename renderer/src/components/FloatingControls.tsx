import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FloatingControlsProps {
  onSettingsChange: (settings: {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    wordSpacing: number;
    bionicReading: boolean;
    readingRuler: boolean;
  }) => void;
}

const FloatingControls: React.FC<FloatingControlsProps> = ({ onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 80 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [letterSpacing, setLetterSpacing] = useState(0.05);
  const [wordSpacing, setWordSpacing] = useState(0.1);
  const [bionicReading, setBionicReading] = useState(false);
  const [readingRuler, setReadingRuler] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSettingsChange({
      fontSize,
      lineHeight,
      letterSpacing,
      wordSpacing,
      bionicReading,
      readingRuler
    });
  }, [fontSize, lineHeight, letterSpacing, wordSpacing, bionicReading, readingRuler]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.control-item')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y))
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Create portal root to render outside of main React tree
  const portalRoot = document.body;

  const floatingUI = (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            right: 20,
            top: 140, // below toolbar
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            fontSize: 24,
            zIndex: 2147483647, // max 32-bit int for absolute top layer
            transition: 'transform .15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🎛️
        </button>
      )}

      {/* Draggable panel */}
      {isOpen && (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: 320,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 2147483647, // max z-index
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            fontFamily: "'OpenDyslexic', system-ui, sans-serif"
          }}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            color: '#fff',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 600
          }}>
            <span>📖 Reading Controls</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                width: 24,
                height: 24,
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              ✕
            </button>
          </div>

          {/* Controls */}
          <div style={{ padding: '16px', fontSize: 13 }} className="controls-body">
            {/* Font Size */}
            <div className="control-item" style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 600 }}>
                <span>Font Size</span>
                <span style={{ color: '#667eea' }}>{fontSize}px</span>
              </label>
              <input
                type="range"
                min="12"
                max="32"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Line Height */}
            <div className="control-item" style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 600 }}>
                <span>Line Height</span>
                <span style={{ color: '#667eea' }}>{lineHeight.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Letter Spacing */}
            <div className="control-item" style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 600 }}>
                <span>Letter Spacing</span>
                <span style={{ color: '#667eea' }}>{letterSpacing.toFixed(2)}em</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.01"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Word Spacing */}
            <div className="control-item" style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 600 }}>
                <span>Word Spacing</span>
                <span style={{ color: '#667eea' }}>{wordSpacing.toFixed(2)}em</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={wordSpacing}
                onChange={(e) => setWordSpacing(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Bionic Reading Toggle */}
            <div className="control-item" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="bionic"
                checked={bionicReading}
                onChange={(e) => setBionicReading(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <label htmlFor="bionic" style={{ flex: 1, cursor: 'pointer', fontWeight: 500 }}>
                <strong>Bionic Reading</strong> (Bold word starts)
              </label>
            </div>

            {/* Reading Ruler Toggle */}
            <div className="control-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="ruler"
                checked={readingRuler}
                onChange={(e) => setReadingRuler(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <label htmlFor="ruler" style={{ flex: 1, cursor: 'pointer', fontWeight: 500 }}>
                <strong>Reading Ruler</strong> (Cursor line)
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Render via portal to escape React tree and BrowserView layer
  return createPortal(floatingUI, portalRoot);
};

export default FloatingControls;
