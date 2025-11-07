import type { AssessmentResult, DyslexiaProfile, DyslexiaProfileType } from '../types/dyslexia';

interface Scores {
  phonological: number;
  surface: number;
  visual: number;
  comprehension: number;
}

export class DyslexiaClassifier {
  classify(assessment: AssessmentResult): DyslexiaProfile {
    const scores = this.calculateScores(assessment);
    const profile = this.determineProfile(scores);
    const features = this.recommendFeatures(profile);

    return {
      profile,
      confidence: this.calculateConfidence(scores),
      scores,
      recommendedFeatures: features,
      timestamp: Date.now()
    };
  }

  private calculateScores(assessment: AssessmentResult): Scores {
    return {
      phonological: this.calculatePhonologicalScore(assessment),
      surface: this.calculateSurfaceScore(assessment),
      visual: this.calculateVisualScore(assessment),
      comprehension: this.calculateComprehensionScore(assessment)
    };
  }

  private calculatePhonologicalScore(assessment: AssessmentResult): number {
    const { lexicalDecision, rapidNaming } = assessment;
    
    // High phonological errors + slow naming = phonological dyslexia
    const phonologicalErrorWeight = (lexicalDecision.phonologicalErrors / 20) * 40;
    const namingSpeedWeight = Math.min((rapidNaming.avgTime / 1000) * 30, 30);
    const hesitationWeight = (rapidNaming.hesitations / 10) * 30;
    
    return Math.min(phonologicalErrorWeight + namingSpeedWeight + hesitationWeight, 100);
  }

  private calculateSurfaceScore(assessment: AssessmentResult): number {
    const { readingSpeed, lexicalDecision } = assessment;
    
    // Slow reading + visual word form issues = surface dyslexia
    const speedPenalty = Math.max(0, (150 - readingSpeed.wpm) / 150 * 40);
    const accuracyPenalty = (1 - lexicalDecision.accuracy) * 40;
    const errorWeight = (readingSpeed.errors / 10) * 20;
    
    return Math.min(speedPenalty + accuracyPenalty + errorWeight, 100);
  }

  private calculateVisualScore(assessment: AssessmentResult): number {
    const { visualTracking, selfReport } = assessment;
    
    // Poor tracking + visual stress = visual dyslexia
    const trackingPenalty = (1 - visualTracking.hitRate) * 35;
    const focusLossWeight = (visualTracking.lostFocus / 5) * 25;
    const selfReportWeight = ((selfReport.visualStress + selfReport.wordBlurring) / 20) * 40;
    
    return Math.min(trackingPenalty + focusLossWeight + selfReportWeight, 100);
  }

  private calculateComprehensionScore(assessment: AssessmentResult): number {
    const { comprehension, selfReport } = assessment;
    
    // Poor comprehension despite decent decoding
    const accuracyPenalty = (1 - comprehension.accuracy) * 50;
    const timeWeight = Math.min((comprehension.timePerQuestion / 30) * 30, 30);
    const fatigueWeight = (selfReport.readingFatigue / 10) * 20;
    
    return Math.min(accuracyPenalty + timeWeight + fatigueWeight, 100);
  }

  private determineProfile(scores: Scores): DyslexiaProfileType {
    const values = Object.values(scores) as number[];
    const maxScore = Math.max(...values);

    const avgScore = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const variance = values.reduce((sum: number, score: number) => sum + Math.pow(score - avgScore, 2), 0) / values.length;

    if (variance < 100) {
      return 'mixed';
    }

    const entries = Object.entries(scores) as [DyslexiaProfileType, number][];
    const dominantProfile = entries.find(([_, score]) => score === maxScore);
    return dominantProfile ? dominantProfile[0] : 'mixed';
  }

  private calculateConfidence(scores: Scores): number {
    const vals = Object.values(scores) as number[];
    const maxScore = Math.max(...vals);
    const secondMaxScore = [...vals].sort((a, b) => b - a)[1] ?? 0;

    const separation = maxScore - secondMaxScore;
    return Math.min((separation / 50) * 100, 100);
  }

  private recommendFeatures(profile: DyslexiaProfileType): string[] {
    const features: { [key in DyslexiaProfileType]: string[] } = {
      phonological: ['Text-to-Speech with Highlighting', 'Phonetic Word Breakdown', 'Audio Support', 'Syllable Emphasis', 'Increased Font Size'],
      surface: ['OpenDyslexic Font', 'Increased Letter Spacing', 'Word Tracking Ruler', 'Larger Line Height', 'High Contrast Mode'],
      visual: ['Color Overlays', 'Line Focus Mode', 'Tinted Background', 'Reduced Animation', 'Sans-serif Fonts'],
      comprehension: ['Text Chunking', 'Auto-Summarization', 'Key Point Highlighting', 'Reading Time Estimation', 'Simplified Language'],
      mixed: ['Reader View', 'Customizable Font', 'TTS Support', 'Line Highlighting', 'Adjustable Spacing']
    };
    return features[profile] || features.mixed;
  }
}
