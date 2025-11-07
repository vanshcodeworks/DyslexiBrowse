import React, { useState, useEffect, useRef } from 'react';

interface VisualTrackingTestProps {
  onComplete: (data: { hitRate: number; latencyVariance: number; lostFocus: number }) => void;
}

const VisualTrackingTest: React.FC<VisualTrackingTestProps> = ({ onComplete }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [lostFocusCount, setLostFocusCount] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const lastMoveTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalMoves = 15;

  useEffect(() => {
    if (!isStarted || moveCount >= totalMoves) return;

    const interval = setInterval(() => {
      const newX = Math.random() * 80 + 10; // 10-90%
      const newY = Math.random() * 70 + 10;
      setPosition({ x: newX, y: newY });
      lastMoveTime.current = Date.now();
      setMoveCount(prev => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [isStarted, moveCount]);

  useEffect(() => {
    if (moveCount >= totalMoves && isStarted) {
      // Test complete
      const hitRate = hits / (hits + misses) || 0;
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
      const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencies.length || 0;
      
      onComplete({
        hitRate,
        latencyVariance: variance,
        lostFocus: lostFocusCount
      });
    }
  }, [moveCount, isStarted]);

  const handleTargetClick = () => {
    const latency = Date.now() - lastMoveTime.current;
    setHits(prev => prev + 1);
    setLatencies(prev => [...prev, latency]);
  };

  const handleMissClick = () => {
    setMisses(prev => prev + 1);
  };

  const handleBlur = () => {
    setLostFocusCount(prev => prev + 1);
  };

  if (!isStarted) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ color: '#2C3E50', marginBottom: '1rem' }}>Visual Tracking Test</h2>
        <div style={{ background: '#E3F2FD', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          <p style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
            Click the moving circle as quickly as you can each time it appears.
          </p>
          <p style={{ lineHeight: 1.6 }}>
            The circle will move to a new position every 2 seconds. Try to click it before it moves again.
          </p>
        </div>
        <button 
          onClick={() => setIsStarted(true)}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.1rem',
            background: '#4A90E2',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Start Test
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#666' }}>
        <span>Targets: {moveCount}/{totalMoves}</span>
        <span>Hits: {hits} | Misses: {misses}</span>
      </div>

      <div
        ref={containerRef}
        onClick={handleMissClick}
        onBlur={handleBlur}
        tabIndex={0}
        style={{
          position: 'relative',
          width: '100%',
          height: 400,
          background: '#f5f5f5',
          borderRadius: 12,
          border: '2px solid #ddd',
          overflow: 'hidden',
          cursor: 'crosshair'
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleTargetClick();
          }}
          style={{
            position: 'absolute',
            left: `${position.x}%`,
            top: `${position.y}%`,
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }}
        />
      </div>
    </div>
  );
};

export default VisualTrackingTest;
