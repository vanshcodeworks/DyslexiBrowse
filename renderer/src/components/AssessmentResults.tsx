import React from 'react';
import type { DyslexiaProfile } from '../types/dyslexia';

interface AssessmentResultsProps {
  profile: DyslexiaProfile;
  onContinue: () => void;
}

const AssessmentResults: React.FC<AssessmentResultsProps> = ({ profile, onContinue }) => {
  const profileDescriptions = {
    phonological: {
      title: 'Phonological Dyslexia',
      description: 'You may find it challenging to sound out unfamiliar words or break words into smaller parts. You benefit most from hearing words spoken and visual word recognition.',
      icon: '🗣️',
      color: '#667eea'
    },
    surface: {
      title: 'Surface Dyslexia',
      description: 'You may read slowly and rely on sounding out words. Irregular words that don\'t follow phonetic rules can be particularly challenging.',
      icon: '📖',
      color: '#f093fb'
    },
    visual: {
      title: 'Visual Dyslexia',
      description: 'Visual processing differences may make it harder to track lines of text or distinguish similar-looking letters. You benefit from reduced visual clutter and tracking aids.',
      icon: '👁️',
      color: '#4facfe'
    },
    comprehension: {
      title: 'Comprehension-Focused',
      description: 'While you can decode words well, understanding and retaining the meaning of text may require extra effort. Breaking text into chunks helps.',
      icon: '💭',
      color: '#43e97b'
    },
    mixed: {
      title: 'Mixed Profile',
      description: 'You show characteristics from multiple dyslexia profiles. We\'ll use a combination of strategies to support your reading.',
      icon: '🎯',
      color: '#fa709a'
    }
  };

  const desc = profileDescriptions[profile.profile];

  return (
    <div style={{ 
      maxWidth: 900, 
      margin: '0 auto', 
      padding: '3rem 2rem',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{desc.icon}</div>
        <h1 style={{ 
          fontSize: '2.5rem', 
          color: desc.color,
          marginBottom: '0.5rem'
        }}>
          {desc.title}
        </h1>
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1.5rem',
          background: `${desc.color}20`,
          borderRadius: 20,
          fontSize: '0.9rem',
          fontWeight: 600,
          color: desc.color
        }}>
          {Math.round(profile.confidence)}% Confidence
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        marginBottom: '2rem'
      }}>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#555', marginBottom: '2rem' }}>
          {desc.description}
        </p>

        <h3 style={{ marginBottom: '1rem', color: '#2C3E50' }}>📊 Your Scores</h3>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {Object.entries(profile.scores).map(([key, value]) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{key}</span>
                <span style={{ color: '#667eea', fontWeight: 700 }}>{value.toFixed(1)}</span>
              </div>
              <div style={{ 
                background: '#e0e0e0', 
                height: 8, 
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${value * 10}%`,
                  height: '100%',
                  background: desc.color,
                  borderRadius: 4,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: '1rem', color: '#2C3E50' }}>✨ Recommended Features</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {profile.recommendedFeatures.map((feature, index) => (
            <div
              key={index}
              style={{
                background: `${desc.color}15`,
                padding: '0.75rem 1rem',
                borderRadius: 8,
                border: `2px solid ${desc.color}30`,
                fontWeight: 500,
                fontSize: '0.9rem',
                color: '#2C3E50'
              }}
            >
              ✓ {feature}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        padding: '1.5rem',
        borderRadius: 12,
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#555', lineHeight: 1.6 }}>
          <strong>🎉 Great job!</strong> Your personalized browsing experience is ready. 
          All websites will now automatically adapt to your reading style.
        </p>
      </div>

      <button
        onClick={onContinue}
        style={{
          width: '100%',
          padding: '1.5rem',
          fontSize: '1.2rem',
          fontWeight: 700,
          background: `linear-gradient(135deg, ${desc.color} 0%, ${desc.color}dd 100%)`,
          color: 'white',
          border: 'none',
          borderRadius: 12,
          cursor: 'pointer',
          transition: 'transform 0.2s',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        Start Browsing →
      </button>
    </div>
  );
};

export default AssessmentResults;
