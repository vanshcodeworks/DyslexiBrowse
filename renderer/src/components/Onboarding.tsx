import React, { useState } from 'react';
import type { DyslexiaProfile, AssessmentResult } from '../types/dyslexia';
import { DyslexiaClassifier } from '../utils/classifier';
import ReadingSpeedTest from './ReadingSpeedTest';
import LexicalDecisionTest from './LexicalDecisionTest';
import VisualTrackingTest from './VisualTrackingTest';
import RapidNamingTest from './RapidNamingTest';
import ComprehensionTest from './ComprehensionTest';
import SelfReportSurvey from './SelfReportSurvey';
import AssessmentResults from './AssessmentResults';

interface OnboardingProps {
  onComplete: (profile: DyslexiaProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(-1); // Start at -1 to show welcome
  const [assessmentData, setAssessmentData] = useState<Partial<AssessmentResult>>({});
  const [profile, setProfile] = useState<DyslexiaProfile | null>(null);

  const steps = [
    { name: 'Reading Speed', component: ReadingSpeedTest, field: 'readingSpeed' },
    { name: 'Word Recognition', component: LexicalDecisionTest, field: 'lexicalDecision' },
    { name: 'Visual Tracking', component: VisualTrackingTest, field: 'visualTracking' },
    { name: 'Rapid Naming', component: RapidNamingTest, field: 'rapidNaming' },
    { name: 'Comprehension', component: ComprehensionTest, field: 'comprehension' },
    { name: 'Self-Assessment', component: SelfReportSurvey, field: 'selfReport' }
  ];

  const handleTestComplete = (field: string, data: any) => {
    const newData = { ...assessmentData, [field]: data };
    setAssessmentData(newData);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All tests complete - classify profile
      const classifier = new DyslexiaClassifier();
      const result = classifier.classify(newData as AssessmentResult);
      setProfile(result);
    }
  };

  if (profile) {
    return <AssessmentResults profile={profile} onContinue={() => onComplete(profile)} />;
  }

  if (currentStep === -1) {
    return (
      <div style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: '2.5rem 2rem',
        height: '100vh',
        overflowY: 'auto',
        background: '#fafbfc',
        color: '#222'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem'
          }}>
            Welcome to DyslexiBrowse
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#666', lineHeight: 1.6 }}>
            Personalized web browsing designed for your unique reading style
          </p>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          padding: '2rem',
          borderRadius: 16,
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2C3E50' }}>
            📋 Quick Assessment (5 minutes)
          </h2>
          <p style={{ lineHeight: 1.8, color: '#555', marginBottom: '1.5rem' }}>
            We'll guide you through {steps.length} quick tests to understand your reading preferences. 
            This helps us personalize every website you visit.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {steps.map((step, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 8,
                border: '2px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#667eea',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  {index + 1}
                </div>
                <span style={{ fontWeight: 500, color: '#2C3E50' }}>{step.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: 8,
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <p style={{ margin: 0, color: '#856404', lineHeight: 1.6 }}>
            <strong>💡 Tip:</strong> There are no wrong answers! This assessment helps us understand 
            how you read best, not test your abilities.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          <button
            onClick={() => setCurrentStep(0)} // Start at step 0
            style={{
              width: '100%',
              padding: '1.5rem',
              fontSize: '1.2rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            Begin Assessment →
          </button>
          
          <button
            onClick={() => onComplete(null as any)}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: 'transparent',
              color: '#666',
              border: '2px solid #ddd',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
              e.currentTarget.style.color = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.color = '#666';
            }}
          >
            Skip for now, I'll browse manually
          </button>
        </div>
      </div>
    );
  }

  const CurrentTest = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      background: '#fafbfc'
    }}>
      {/* Progress Bar */}
      <div style={{ background: 'white', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: '#2C3E50' }}>
              {steps[currentStep].name}
            </span>
            <span style={{ color: '#666', fontSize: '0.9rem' }}>
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div style={{ 
            background: '#e0e0e0', 
            height: 8, 
            borderRadius: 4, 
            overflow: 'hidden' 
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s ease',
              borderRadius: 4
            }} />
          </div>
        </div>
      </div>

      {/* Test Component */}
      <div style={{ paddingTop: '2rem' }}>
        <CurrentTest onComplete={(data) => handleTestComplete(steps[currentStep].field, data)} />
      </div>
    </div>
  );
};

export default Onboarding;
