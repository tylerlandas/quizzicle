import axios from 'axios';
import type { User, Question } from '../types';

const http = axios.create({ baseURL: '/api' });

export async function loginUser(name: string): Promise<{ user: User; isNew: boolean }> {
  const { data } = await http.post<{ user: User; isNew: boolean }>('/users/login', { name });
  return data;
}

export async function getRandomQuestions(count: number, exclude: string[]): Promise<Question[]> {
  const params: Record<string, string> = { count: String(count) };
  if (exclude.length > 0) params.exclude = exclude.join(',');
  const { data } = await http.get<Question[]>('/questions/random', { params });
  return data;
}

export async function saveSession(payload: {
  userId: string;
  userName: string;
  questionsAsked: string[];
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
}): Promise<void> {
  await http.post('/sessions', payload);
}

export async function updateUserPreferences(
  userId: string,
  preferences: { soundEnabled: boolean }
): Promise<User> {
  const { data } = await http.patch<User>(`/users/${userId}/preferences`, preferences);
  return data;
}

export interface LeaderboardEntry {
  _id: string;
  name: string;
  totalScore: number;
  gamesPlayed: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await http.get<LeaderboardEntry[]>('/users/leaderboard');
  return data;
}

export async function updateUserScore(
  userId: string,
  score: number,
  questionsAnswered: string[]
): Promise<User> {
  const { data } = await http.patch<User>(`/users/${userId}/score`, {
    score,
    questionsAnswered,
  });
  return data;
}
