export type DyslexiaProfileType = 'phonological' | 'surface' | 'visual' | 'comprehension' | 'mixed';

export interface DyslexiaProfile {
  profile: DyslexiaProfileType;
  confidence: number;
  scores: {
    phonological: number;
    surface: number;
    visual: number;
    comprehension: number;
  };
  recommendedFeatures: string[];
  timestamp: number;
}

export interface AssessmentResult {
  readingSpeed: {
    wpm: number;
    errors: number;
    duration: number;
  };
  lexicalDecision: {
    accuracy: number;
    reactionTime: number;
    phonologicalErrors: number;
  };
  visualTracking: {
    hitRate: number;
    latencyVariance: number;
    lostFocus: number;
  };
  rapidNaming: {
    avgTime: number;
    hesitations: number;
    totalTime: number;
  };
  comprehension: {
    accuracy: number;
    timePerQuestion: number;
    totalQuestions: number;
  };
  selfReport: {
    visualStress: number;
    readingFatigue: number;
    wordBlurring: number;
    lineTracking: number;
    colorSensitivity: number;
  };
}

export interface ReadingMetrics {
  sessionStart: number;
  sessionEnd: number;
  wordsRead: number;
  pagesVisited: number;
  readingSpeed: number;
  comprehensionScore: number;
  comfortRating: number;
  adaptationsUsed: string[];
}

export interface AdaptationSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  backgroundColor: string;
  textColor: string;
  enableLineHighlight: boolean;
  enableTTS: boolean;
  enableReaderView: boolean;
  colorOverlay: string;
}
