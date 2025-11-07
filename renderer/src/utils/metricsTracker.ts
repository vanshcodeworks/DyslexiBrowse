import type { ReadingMetrics } from '../types/dyslexia';

// Added constants + helper types + safe storage
const SESSIONS_KEY = 'dyslexibrowse-sessions';
const TASKS_KEY = 'dyslexibrowse-tasks';

interface TaskMetric {
  name: string;
  duration: number;
  timestamp: number;
}

interface ImprovementMetrics {
  readingSpeed: number;
  comprehension: number;
  comfort: number;
  sessionsCount: number;
  totalWordsRead: number;
  totalPagesVisited: number;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function safeSet(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export class MetricsTracker {
  private startTimes: Map<string, number> = new Map();
  private sessionMetrics: ReadingMetrics | null = null;

  startSession(): void {
    this.sessionMetrics = {
      sessionStart: Date.now(),
      sessionEnd: 0,
      wordsRead: 0,
      pagesVisited: 0,
      readingSpeed: 0,
      comprehensionScore: 0,
      comfortRating: 0,
      adaptationsUsed: []
    };
  }

  // NEW: track comprehension performance
  trackComprehension(totalQuestions: number, correctAnswers: number, totalTimeSeconds: number): void {
    if (!this.sessionMetrics) return;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) : 0;
    // Weighted score: accuracy (70%) + time efficiency (30%)
    const timeEfficiency = totalTimeSeconds > 0 ? Math.min(1, (totalQuestions * 20) / totalTimeSeconds) : 0;
    const composite = (accuracy * 0.7 + timeEfficiency * 0.3) * 100;
    this.sessionMetrics.comprehensionScore = Math.round(composite);
  }

  endSession(comfortRating: number): ReadingMetrics | null {
    if (!this.sessionMetrics) return null;
    this.sessionMetrics.sessionEnd = Date.now();
    this.sessionMetrics.comfortRating = comfortRating;
    const durationMin = (this.sessionMetrics.sessionEnd - this.sessionMetrics.sessionStart) / 60000;
    this.sessionMetrics.readingSpeed = durationMin > 0 ? this.sessionMetrics.wordsRead / durationMin : 0;
    this.saveMetrics(this.sessionMetrics);
    return this.sessionMetrics;
  }

  trackPageVisit(wordCount: number): void {
    if (!this.sessionMetrics) return;

    this.sessionMetrics.pagesVisited++;
    this.sessionMetrics.wordsRead += wordCount;
  }

  trackAdaptation(adaptationName: string): void {
    if (!this.sessionMetrics) return;

    if (!this.sessionMetrics.adaptationsUsed.includes(adaptationName)) {
      this.sessionMetrics.adaptationsUsed.push(adaptationName);
    }
  }

  startTask(taskName: string): void {
    this.startTimes.set(taskName, Date.now());
  }

  endTask(taskName: string): number {
    const startTime = this.startTimes.get(taskName);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.saveTaskMetric(taskName, duration);
    this.startTimes.delete(taskName);
    
    return duration;
  }

  private saveMetrics(metrics: ReadingMetrics): void {
    const all = this.getAllMetrics();
    all.push(metrics);
    safeSet(SESSIONS_KEY, all);
  }

  private saveTaskMetric(name: string, duration: number): void {
    const tasks = this.getTaskMetrics();
    tasks.push({ name, duration, timestamp: Date.now() });
    safeSet(TASKS_KEY, tasks);
  }

  getAllMetrics(): ReadingMetrics[] {
    return safeParse<ReadingMetrics[]>(localStorage.getItem(SESSIONS_KEY), []);
  }

  getTaskMetrics(): TaskMetric[] {
    return safeParse<TaskMetric[]>(localStorage.getItem(TASKS_KEY), []);
  }

  getImprovementMetrics(): ImprovementMetrics {
    const sessions = this.getAllMetrics();
    if (sessions.length < 2) {
      return {
        readingSpeed: 0,
        comprehension: 0,
        comfort: 0,
        sessionsCount: sessions.length,
        totalWordsRead: sessions.reduce((s, m) => s + m.wordsRead, 0),
        totalPagesVisited: sessions.reduce((s, m) => s + m.pagesVisited, 0)
      };
    }
    const first = sessions[0];
    const recent = sessions.slice(-Math.min(5, sessions.length));
    const avgSpeedRecent = recent.reduce((s, m) => s + m.readingSpeed, 0) / recent.length;
    const avgCompRecent = recent.reduce((s, m) => s + m.comprehensionScore, 0) / recent.length;
    const avgComfortRecent = recent.reduce((s, m) => s + m.comfortRating, 0) / recent.length;

    const readingSpeed = first.readingSpeed > 0
      ? ((avgSpeedRecent - first.readingSpeed) / first.readingSpeed) * 100
      : 0;
    const comprehension = first.comprehensionScore > 0
      ? ((avgCompRecent - first.comprehensionScore) / first.comprehensionScore) * 100
      : (avgCompRecent > 0 ? 100 : 0);
    const comfort = first.comfortRating > 0
      ? ((avgComfortRecent - first.comfortRating) / first.comfortRating) * 100
      : (avgComfortRecent > 0 ? 100 : 0);

    return {
      readingSpeed: Math.round(readingSpeed),
      comprehension: Math.round(comprehension),
      comfort: Math.round(comfort),
      sessionsCount: sessions.length,
      totalWordsRead: sessions.reduce((s, m) => s + m.wordsRead, 0),
      totalPagesVisited: sessions.reduce((s, m) => s + m.pagesVisited, 0)
    };
  }

  clearAllMetrics(): void {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(TASKS_KEY);
    this.sessionMetrics = null;
  }
}
