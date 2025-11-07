import { useState } from 'react';

interface LexicalDecisionTestProps {
  onComplete: (data: { accuracy: number; reactionTime: number; phonologicalErrors: number }) => void;
}

const LexicalDecisionTest: React.FC<LexicalDecisionTestProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<{ word: string; isReal: boolean; userSaid: boolean; time: number }[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [isStarted, setIsStarted] = useState(false);

  // Mix of real words and phonologically similar non-words
  const testItems = [
    { word: 'bread', isReal: true },
    { word: 'brane', isReal: false }, // phonological error
    { word: 'phone', isReal: true },
    { word: 'fone', isReal: false },
    { word: 'night', isReal: true },
    { word: 'nite', isReal: false },
    { word: 'write', isReal: true },
    { word: 'rite', isReal: false },
    { word: 'through', isReal: true },
    { word: 'thru', isReal: false },
    { word: 'enough', isReal: true },
    { word: 'enuf', isReal: false },
    { word: 'friend', isReal: true },
    { word: 'frend', isReal: false },
    { word: 'people', isReal: true },
    { word: 'peple', isReal: false },
    { word: 'because', isReal: true },
    { word: 'becuz', isReal: false },
    { word: 'school', isReal: true },
    { word: 'skool', isReal: false }
  ];

  const handleResponse = (userSaidReal: boolean) => {
    const responseTime = Date.now() - startTime;
    const item = testItems[currentIndex];
    
    setResponses([...responses, {
      word: item.word,
      isReal: item.isReal,
      userSaid: userSaidReal,
      time: responseTime
    }]);

    if (currentIndex < testItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setStartTime(Date.now());
    } else {
      // Test complete - calculate results
      const allResponses = [...responses, {
        word: item.word,
        isReal: item.isReal,
        userSaid: userSaidReal,
        time: responseTime
      }];
      
      const correct = allResponses.filter(r => r.isReal === r.userSaid).length;
      const accuracy = correct / allResponses.length;
      const avgTime = allResponses.reduce((sum, r) => sum + r.time, 0) / allResponses.length;
      
      // Count phonological confusion errors (said real word is fake)
      const phonologicalErrors = allResponses.filter(r => !r.isReal && r.userSaid === true).length;
      
      onComplete({ accuracy, reactionTime: avgTime, phonologicalErrors });
    }
  };

  const startTest = () => {
    setIsStarted(true);
    setStartTime(Date.now());
  };

  if (!isStarted) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ color: '#2C3E50', marginBottom: '1rem' }}>Word Recognition Test</h2>
        <div style={{ background: '#E3F2FD', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          <p style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
            You will see words one at a time. Decide if each word is a <strong>real English word</strong> or a <strong>made-up word</strong>.
          </p>
          <p style={{ lineHeight: 1.6 }}>
            Click "Real Word" or "Fake Word" as quickly and accurately as possible.
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
          Start Test
        </button>
      </div>
    );
  }

  const currentItem = testItems[currentIndex];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <div style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
        Question {currentIndex + 1} of {testItems.length}
      </div>
      
      <div style={{
        background: '#f5f5f5',
        padding: '3rem 2rem',
        borderRadius: 12,
        marginBottom: '2rem',
        minHeight: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          color: '#2C3E50',
          letterSpacing: '0.02em'
        }}>
          {currentItem.word}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={() => handleResponse(true)}
          style={{
            flex: 1,
            maxWidth: 200,
            padding: '1.2rem',
            fontSize: '1.1rem',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          ✓ Real Word
        </button>
        <button
          onClick={() => handleResponse(false)}
          style={{
            flex: 1,
            maxWidth: 200,
            padding: '1.2rem',
            fontSize: '1.1rem',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          ✗ Fake Word
        </button>
      </div>
    </div>
  );
};

export default LexicalDecisionTest;
