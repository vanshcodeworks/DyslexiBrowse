import React, { useEffect } from 'react';
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

  // Inject OpenDyslexic font once
  useEffect(() => {
    if (!document.querySelector('link[data-open-dyslexic]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.0/open-dyslexic.min.css';
      link.setAttribute('data-open-dyslexic', 'true');
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div
      style={{
        fontFamily: "'OpenDyslexic', system-ui, sans-serif",
        maxWidth: 960,
        margin: '0 auto',
        padding: '2rem 2rem 3.5rem',
        minHeight: '100vh',
        background: '#f1f3f4',
        color: '#1f1f1f',
        lineHeight: 1.55
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: '#ffffff',
          padding: '0.85rem 1.25rem',
          borderRadius: 12,
          border: '1px solid #d6d9dd',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ fontSize: '2.5rem' }}>{desc.icon}</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '1.55rem',
              fontWeight: 600,
              letterSpacing: '.5px',
              color: '#2c2d30',
              marginBottom: '.35rem'
            }}
          >
            {desc.title}
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '.35rem .75rem',
              background: '#eef1f3',
              border: '1px solid #d0d5da',
              borderRadius: 6,
              fontSize: '.75rem',
              fontWeight: 600,
              letterSpacing: '.5px'
            }}
          >
            Confidence {Math.round(profile.confidence)}%
          </div>
        </div>
        <button
          onClick={onContinue}
          className="adapt-toggle"
          style={{
            background: 'linear-gradient(90deg,#1a73e8,#1558b0)',
            padding: '10px 20px',
            border: '1px solid #1558b0'
          }}
        >
          Start Browsing →
        </button>
      </div>

      {/* Description + Scores */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #d6d9dd',
          borderRadius: 12,
          padding: '1.75rem 1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
        }}
      >
        <p style={{ margin: 0, fontSize: '.95rem', color: '#3b3c40', marginBottom: '1.25rem' }}>
          {desc.description}
        </p>

        <h3
          style={{
            fontSize: '.9rem',
            fontWeight: 700,
            letterSpacing: '.6px',
            textTransform: 'uppercase',
            color: '#5f6368',
            margin: '1.1rem 0 .6rem'
          }}
        >
          Your Scores
        </h3>
        <div style={{ display: 'grid', gap: '.9rem', marginBottom: '1.25rem' }}>
          {Object.entries(profile.scores).map(([key, value]) => (
            <div key={key}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '.75rem',
                  fontWeight: 600,
                  color: '#474a4d',
                  marginBottom: '.35rem',
                  textTransform: 'capitalize'
                }}
              >
                <span>{key}</span>
                <span>{value.toFixed(1)}</span>
              </div>
              <div
                style={{
                  height: 10,
                  background: '#e2e5e7',
                  borderRadius: 5,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: `${Math.min(value, 10) * 10}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg,#8ab4f8,#5a95f1)',
                    transition: 'width .4s ease'
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <h3
          style={{
            fontSize: '.9rem',
            fontWeight: 700,
            letterSpacing: '.6px',
            textTransform: 'uppercase',
            color: '#5f6368',
            margin: '1.1rem 0 .6rem'
          }}
        >
          Recommended Features
        </h3>
        <div
          style={{
            display: 'grid',
            gap: '.6rem',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))'
          }}
        >
          {profile.recommendedFeatures.map((f, i) => (
            <div
              key={i}
              style={{
                background: '#f7f9fa',
                border: '1px solid #d0d5da',
                padding: '.55rem .7rem',
                borderRadius: 6,
                fontSize: '.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '.4rem',
                color: '#2e3134'
              }}
            >
              ✓ {f}
            </div>
          ))}
        </div>
      </div>

      {/* Info footer */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #d6d9dd',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          fontSize: '.8rem',
          color: '#4a4d50'
        }}
      >
        <strong style={{ fontWeight: 700 }}>Personalization enabled.</strong> Sites will adapt
        using dyslexia-friendly font, spacing, and assistive features. You can retake the
        assessment in Settings anytime.
      </div>
    </div>
  );
};

export default AssessmentResults;
