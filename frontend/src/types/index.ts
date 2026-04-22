export interface Question {
  _id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface User {
  _id: string;
  name: string;
  totalScore: number;
  questionsAnswered: string[];
  gamesPlayed: number;
  soundEnabled: boolean;
}

export type GamePhase =
  | 'name-entry'
  | 'loading'
  | 'playing'
  | 'feedback'
  | 'round-results';
