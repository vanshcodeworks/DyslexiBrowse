import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FloatingControls from './components/FloatingControls';
import ReadingRuler from './components/ReadingRuler';
import { AdaptationEngine } from './utils/adaptationEngine';

const engine = new AdaptationEngine();

const Overlay: React.FC = () => {
  const [ruler, setRuler] = useState(false);

  const onSettingsChange = async (s: {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    wordSpacing: number;
    bionicReading: boolean;
    readingRuler: boolean;
    focusMode?: boolean; // optional from UI, default false
  }) => {
    setRuler(!!s.readingRuler);

    // Only pass expected keys to engine
    await engine.applyDynamicSettings({
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      wordSpacing: s.wordSpacing,
      bionicReading: s.bionicReading,
      focusMode: !!s.focusMode,
    });
  };

  return (
    <>
      <FloatingControls onSettingsChange={onSettingsChange} />
      <ReadingRuler enabled={ruler} />
    </>
  );
};

createRoot(document.getElementById('overlay-root')!).render(<Overlay />);
