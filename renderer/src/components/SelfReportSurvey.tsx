import React, { useState } from 'react';

interface SelfReportSurveyProps {
  onComplete: (data: {
    visualStress: number;
    readingFatigue: number;
    wordBlurring: number;
    lineTracking: number;
    colorSensitivity: number;
  }) => void;
}

const SelfReportSurvey: React.FC<SelfReportSurveyProps> = ({ onComplete }) => {
  const [responses, setResponses] = useState({
    visualStress: 5,
    readingFatigue: 5,
    wordBlurring: 5,
    lineTracking: 5,
    colorSensitivity: 5
  });

  const questions = [
    { key: 'visualStress', label: 'How often do you experience visual stress when reading?', low: 'Never', high: 'Always' },
    { key: 'readingFatigue', label: 'How quickly do you feel tired when reading?', low: 'Not at all', high: 'Very quickly' },
    { key: 'wordBlurring', label: 'Do words appear to blur or move on the page?', low: 'Never', high: 'Frequently' },
    { key: 'lineTracking', label: 'Do you lose your place when reading lines of text?', low: 'Rarely', high: 'Often' },
    { key: 'colorSensitivity', label: 'Are you sensitive to bright white backgrounds?', low: 'Not at all', high: 'Very sensitive' }
  ];

  const handleChange = (key: string, value: number) => {
    setResponses({ ...responses, [key]: value });
  };

  const handleSubmit = () => {
    onComplete(responses);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem' }}>
      <h2 style={{ color: '#2C3E50', marginBottom: '1rem' }}>Self-Assessment Survey</h2>
      <p style={{ color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
        Please rate your reading experience on a scale of 1-10:
      </p>

      {questions.map((q, index) => (
        <div key={q.key} style={{ marginBottom: '2.5rem' }}>
          <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600, color: '#2C3E50' }}>
            {index + 1}. {q.label}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#666', minWidth: 80 }}>{q.low}</span>
            <input
              type="range"
              min="1"
              max="10"
              value={responses[q.key as keyof typeof responses]}
              onChange={(e) => handleChange(q.key, parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.85rem', color: '#666', minWidth: 80, textAlign: 'right' }}>{q.high}</span>
            <span style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#4A90E2',
              minWidth: 30,
              textAlign: 'center'
            }}>
              {responses[q.key as keyof typeof responses]}
            </span>
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        style={{
          width: '100%',
          padding: '1.2rem',
          fontSize: '1.1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
          marginTop: '1rem'
        }}
      >
          Complete Assessment
        </button>
    </div>
  );
};

export default SelfReportSurvey;
