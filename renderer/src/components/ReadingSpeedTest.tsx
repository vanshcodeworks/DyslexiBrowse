import React, { useState } from 'react';
import './ReadingSpeedTest.css';

interface ReadingSpeedTestProps {
  onComplete: (data: { wpm: number; errors: number; duration: number }) => void;
}

const ReadingSpeedTest: React.FC<ReadingSpeedTestProps> = ({ onComplete }) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [errors, setErrors] = useState(0);

  const passage = `The quick brown fox jumps over the lazy dog near the riverbank. 
  Scientists have discovered that reading comprehension involves multiple cognitive processes 
  working together simultaneously. The human brain processes written language by recognizing 
  patterns, decoding symbols, and constructing meaning from context. Research shows that 
  different reading strategies can significantly improve understanding and retention of 
  information across various text types and complexity levels.`;

  const wordCount = passage.trim().split(/\s+/).length;

  const handleStart = () => {
    setStartTime(Date.now());
    setIsReading(true);
    setErrors(0);
  };

  const handleComplete = () => {
    if (!startTime) return;

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds
    const minutes = duration / 60;
    const wpm = Math.round(wordCount / minutes);

    setIsReading(false);
    onComplete({ wpm, errors, duration });
  };

  return (
    <div className="reading-speed-test">
      <h2>Reading Speed Assessment</h2>
      <p className="instructions">
        Read the passage below at your normal pace. Click "Start" when ready, 
        then "Complete" when finished. We'll calculate your reading speed.
      </p>

      <div className="passage-container">
        <div className={`passage ${isReading ? 'reading-active' : ''}`}>
          {passage}
        </div>
      </div>

      <div className="error-counter">
        <label>Words you found difficult (optional):</label>
        <input 
          type="number" 
          min="0" 
          max={wordCount}
          value={errors}
          onChange={(e) => setErrors(parseInt(e.target.value) || 0)}
          disabled={!isReading}
        />
      </div>

      <div className="test-controls">
        {!isReading ? (
          <button className="btn-primary" onClick={handleStart}>
            Start Reading
          </button>
        ) : (
          <button className="btn-success" onClick={handleComplete}>
            Complete Test
          </button>
        )}
      </div>

      {startTime && isReading && (
        <div className="timer">
          Time: {Math.floor((Date.now() - startTime) / 1000)}s
        </div>
      )}
    </div>
  );
};

export default ReadingSpeedTest;
