import React, { useState } from 'react';

interface ComprehensionTestProps {
  onComplete: (data: { accuracy: number; timePerQuestion: number; totalQuestions: number }) => void;
}

const ComprehensionTest: React.FC<ComprehensionTestProps> = ({ onComplete }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questionTimes, setQuestionTimes] = useState<number[]>([Date.now()]);
  const [readingPhase, setReadingPhase] = useState(true); // added

  const passage = `The human brain is remarkably adaptable. Scientists have discovered that reading involves multiple regions working together simultaneously. When we read, our visual cortex processes the shapes of letters, while language centers decode meaning. For some people, this process works differently, requiring alternative strategies to achieve the same understanding.`;

  const questions = [
    { q: 'What does the passage say about the human brain?', a: 'It is remarkably adaptable', correct: 0 },
    { q: 'According to the text, what processes letter shapes?', a: 'The visual cortex', correct: 0 },
    { q: 'The passage suggests reading involves:', a: 'Multiple brain regions', correct: 0 },
    { q: 'What do some people need according to the passage?', a: 'Alternative strategies', correct: 0 }
  ];

  const options = [
    ['It is remarkably adaptable', 'It works the same for everyone', 'It cannot change'],
    ['The visual cortex', 'The heart', 'The muscles'],
    ['Multiple brain regions', 'Only one area', 'No brain activity'],
    ['Alternative strategies', 'No help', 'Surgery']
  ];

  const handleAnswer = (optionIndex: number) => {
    const isCorrect = optionIndex === questions[currentQ].correct;
    setAnswers([...answers, isCorrect]);
    setQuestionTimes([...questionTimes, Date.now()]);

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // Calculate results
      const correct = [...answers, isCorrect].filter(Boolean).length;
      const accuracy = correct / questions.length;
      
      const times = questionTimes.slice(1).map((time, i) => time - questionTimes[i]);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length / 1000; // seconds
      
      onComplete({
        accuracy,
        timePerQuestion: avgTime,
        totalQuestions: questions.length
      });
    }
  };

  // Show passage first phase
  if (readingPhase) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 2rem', lineHeight: 1.75, color: '#222', fontSize: '1.05rem' }}>
        <h2 style={{ color: '#2C3E50', marginBottom: '1rem', fontSize: '1.6rem' }}>Reading Comprehension Test</h2>
        <div style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: 14,
          marginBottom: '1.75rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          border: '1px solid #e3e6ea'
        }}>
          {passage}
        </div>
        <div style={{
          background: '#E3F2FD',
          padding: '1rem 1.25rem',
          borderRadius: 10,
          marginBottom: '1.75rem',
          fontSize: '.95rem',
          color: '#2C3E50'
        }}>
          Read the passage above, then answer {questions.length} questions about it.
        </div>
        <button
          onClick={() => {
            setReadingPhase(false);
            setQuestionTimes([Date.now()]);
          }}
          style={{
            width: '100%',
            padding: '1.1rem',
            fontSize: '1.05rem',
            background: '#4A90E2',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600,
            letterSpacing: '.5px'
          }}
        >
          Continue to Questions &rarr;
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 2rem', color: '#222' }}>
      <div style={{ marginBottom: '0.75rem', color: '#555', fontSize: '.85rem', fontWeight: 600 }}>
        Question {currentQ + 1} of {questions.length}
      </div>
      <div style={{
        background: '#fff',
        padding: '1.5rem 1.25rem',
        borderRadius: 12,
        marginBottom: '1.5rem',
        fontSize: '1.05rem',
        fontWeight: 600,
        color: '#1F2D3D',
        border: '1px solid #e3e6ea',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
      }}>
        {questions[currentQ].q}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {options[currentQ].map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            style={{
              padding: '1rem 1.1rem',
              fontSize: '.95rem',
              background: '#ffffff',
              color: '#222',
              border: '2px solid #d9dde2',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 500,
              transition: 'background .15s, border-color .15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f0f7ff';
              e.currentTarget.style.borderColor = '#4A90E2';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#d9dde2';
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ComprehensionTest;
