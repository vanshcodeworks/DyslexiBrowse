import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ReadingRulerProps {
  enabled: boolean;
}

const ReadingRuler: React.FC<ReadingRulerProps> = ({ enabled }) => {
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enabled]);

  if (!enabled) return null;

  const ruler = (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: mouseY - 15,
        width: '100vw',
        height: 30,
        background: 'rgba(102, 126, 234, 0.15)',
        pointerEvents: 'none',
        zIndex: 2147483646, // just below floating controls
        borderTop: '2px solid rgba(102, 126, 234, 0.4)',
        borderBottom: '2px solid rgba(102, 126, 234, 0.4)',
        transition: 'top 0.05s ease-out'
      }}
    />
  );

  return createPortal(ruler, document.body);
};

export default ReadingRuler;
