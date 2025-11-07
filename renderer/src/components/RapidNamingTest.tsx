import React, { useState } from 'react';

interface RapidNamingTestProps {
  onComplete: (data: { avgTime: number; hesitations: number; totalTime: number }) => void;
}

const RapidNamingTest: React.FC<RapidNamingTestProps> = ({ onComplete }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [hesitations, setHesitations] = useState(0);

  const grid = [
    ['A', '5', 'B', '3', 'C'],
    ['7', 'D', '2', 'E', '9'],
    ['F', '4', 'G', '8', 'H'],
    ['1', 'I', '6', 'J', '3']
  ];

  const startTest = () => {
    setIsStarted(true);
    setStartTime(Date.now());
  };

  const handleComplete = () => {
    const totalTime = Date.now() - startTime;
    const totalItems = grid.flat().length;
    const avgTime = totalTime / totalItems;
    
    onComplete({
      avgTime,
      hesitations,
      totalTime
    });
  };

  if (!isStarted) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ color: '#2C3E50', marginBottom: '1rem' }}>Rapid Naming Test</h2>
        <div style={{ background: '#E3F2FD', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          <p style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
            Read the letters and numbers in the grid <strong>out loud</strong> as quickly as you can, going from left to right, top to bottom.
          </p>
          <p style={{ lineHeight: 1.6 }}>
            Click "Mark Hesitation" if you pause or struggle with any item.
          </p>
        </div>
        <button 
          onClick={startTest}
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
          Start Reading
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.5rem' }}>
          Read out loud from left to right ➔
        </p>
        <p style={{ fontSize: '0.9rem', color: '#999' }}>
          Hesitations: {hesitations}
        </p>
      </div>

      <div style={{
        background: '#f5f5f5',
        padding: '2rem',
        borderRadius: 12,
        marginBottom: '2rem'
      }}>
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
            {row.map((item, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  fontSize: '3rem',
                  fontWeight: 700,
                  color: '#2C3E50',
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'white',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => setHesitations(prev => prev + 1)}
          style={{
            flex: 1,
            padding: '1rem',
            fontSize: '1rem',
            background: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          ⚠ Mark Hesitation
        </button>
        <button
          onClick={handleComplete}
          style={{
            flex: 1,
            padding: '1rem',
            fontSize: '1rem',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          ✓ Finished Reading
        </button>
      </div>
    </div>
  );
};

export default RapidNamingTest;
