import { useState, useCallback, useEffect } from 'react';
import NameEntry from './components/NameEntry';
import QuestionCard from './components/QuestionCard';
import FeedbackModal from './components/FeedbackModal';
import RoundResults from './components/RoundResults';
import QuizzicleBackground from './components/QuizzicleBackground';
import Leaderboard from './components/Leaderboard';
import { useAudio } from './hooks/useAudio';
import * as api from './services/api';
import type { LeaderboardEntry } from './services/api';
import type { User, Question, GamePhase } from './types';
import './App.css';

const QUESTIONS_PER_ROUND = 5;
const POINTS_PER_CORRECT = 10;

const ENCOURAGING_PHRASES = [
  "Magnificent! Your neurons are absolute legends!",
  "Brilliant! Are you secretly a walking encyclopedia?",
  "Outstanding! Wikipedia is calling to offer you a job!",
  "Incredible! That brain of yours is basically a supercomputer!",
  "You absolutely nailed it! Take a bow!",
  "Spectacular! Gold star AND a trophy for you!",
  "Phenomenal! You're on fire — someone call the fire department!",
  "BOOM! You're destroying this quiz like a pro!",
  "Flawless! Have you considered a career as a quiz show host?",
  "Correct! I'm genuinely impressed — and I'm hard to impress!",
];

const FUNNY_PUTDOWNS = [
  "Yikes! Even my goldfish knows that one… and he has a 3-second memory!",
  "Oh dear… have you tried turning your brain off and on again?",
  "Wrong! Did you pick that answer with your elbows?",
  "Hmm, interesting choice. Bravely, gloriously incorrect!",
  "Not quite! Have you considered a career change? Maybe interpretive dance?",
  "Oh no… maybe stick to easier hobbies, like watching paint dry?",
  "Wrong! I've seen sharper spoons at a kids' birthday party!",
  "Incorrect! Your search history must be absolutely fascinating.",
  "That's… really not it. Did you sneeze on the keyboard?",
  "Boldly wrong! It takes a very special kind of talent, honestly.",
];

function App() {
  const [phase, setPhase] = useState<GamePhase>('name-entry');
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [roundWrong, setRoundWrong] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const { playHappyMusic, playSadMusic } = useAudio(soundEnabled);

  // Save progress if the user closes the tab or browser without clicking "Save & Quit"
  useEffect(() => {
    if (!user) return;

    const handleUnload = () => {
      const payload = JSON.stringify({ score: sessionScore, questionsAnswered: seenIds });
      navigator.sendBeacon(
        `/api/users/${user._id}/score`,
        new Blob([payload], { type: 'application/json' }),
      );
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user, sessionScore, seenIds]);

  const loadQuestions = useCallback(async (exclude: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      let qs = await api.getRandomQuestions(QUESTIONS_PER_ROUND, exclude);

      if (qs.length < QUESTIONS_PER_ROUND) {
        // All questions seen — restart without exclusions
        qs = await api.getRandomQuestions(QUESTIONS_PER_ROUND, []);
        setSeenIds([]);
      }

      setQuestions(qs);
      setCurrentIndex(0);
      setRoundCorrect(0);
      setRoundWrong(0);
      setRoundScore(0);
      setPhase('playing');
    } catch {
      setError('Failed to load questions. Is the backend running on port 3001?');
      setPhase('name-entry');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNameSubmit = async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: u } = await api.loginUser(name);
      setUser(u);
      setSessionScore(0);
      setSoundEnabled(u.soundEnabled ?? true);
      const exclude = u.questionsAnswered ?? [];
      setSeenIds(exclude);
      await loadQuestions(exclude);
    } catch {
      setError('Cannot connect to the server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (selectedIndex: number) => {
    const question = questions[currentIndex];
    if (!question) return;

    const correct = selectedIndex === question.correctAnswer;

    if (correct) {
      playHappyMusic();
      setFeedbackMsg(ENCOURAGING_PHRASES[Math.floor(Math.random() * ENCOURAGING_PHRASES.length)]);
      setRoundCorrect((n) => n + 1);
      setRoundScore((n) => n + POINTS_PER_CORRECT);
      setSessionScore((n) => n + POINTS_PER_CORRECT);
    } else {
      playSadMusic();
      setFeedbackMsg(FUNNY_PUTDOWNS[Math.floor(Math.random() * FUNNY_PUTDOWNS.length)]);
      setRoundWrong((n) => n + 1);
    }

    setIsCorrect(correct);
    setSeenIds((prev) => [...prev, question._id]);
    setPhase('feedback');
  };

  const handleFeedbackClose = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= QUESTIONS_PER_ROUND) {
      setPhase('round-results');
    } else {
      setCurrentIndex(next);
      setPhase('playing');
    }
  }, [currentIndex]);

  const handleToggleSound = async () => {
    if (!user) return;
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      await api.updateUserPreferences(user._id, { soundEnabled: next });
    } catch {
      // Revert on failure
      setSoundEnabled(!next);
    }
  };

  const handleOpenLeaderboard = async () => {
    setLeaderboardOpen(true);
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const entries = await api.getLeaderboard();
      setLeaderboardEntries(entries);
    } catch {
      setLeaderboardError('Could not load scores. Is the backend running?');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleContinue = async () => {
    await loadQuestions(seenIds);
  };

  const handleQuit = async () => {
    if (!user) {
      setPhase('name-entry');
      return;
    }
    setIsLoading(true);
    try {
      // Save the completed session
      await api.saveSession({
        userId: user._id,
        userName: user.name,
        questionsAsked: seenIds,
        correctAnswers: roundCorrect,
        wrongAnswers: roundWrong,
        score: sessionScore,
      });
      // Persist the accumulated session score to the user record
      await api.updateUserScore(user._id, sessionScore, seenIds);
    } catch {
      // Ignore save errors — still navigate away
    } finally {
      setIsLoading(false);
      setUser(null);
      setPhase('name-entry');
    }
  };

  return (
    <div className="app-root">
      <QuizzicleBackground />
      <main className="app-main">
        {/* Skip-to-content link (WCAG 2.2) */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <div id="main-content">
          {error && (
            <div className="error-banner" role="alert" aria-live="assertive">
              <strong>Error:</strong> {error}
              <button
                className="error-dismiss"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {isLoading && phase === 'name-entry' && (
            <div className="loading-card" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              <span>Loading your game…</span>
            </div>
          )}

          {phase === 'name-entry' && !isLoading && (
            <NameEntry
              onSubmit={handleNameSubmit}
              isLoading={isLoading}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled((s) => !s)}
              onOpenLeaderboard={handleOpenLeaderboard}
            />
          )}

          {leaderboardOpen && (
            <Leaderboard
              entries={leaderboardEntries}
              isLoading={leaderboardLoading}
              error={leaderboardError}
              onClose={() => setLeaderboardOpen(false)}
            />
          )}

          {(phase === 'playing' || phase === 'feedback') && questions.length > 0 && (
            <QuestionCard
              question={questions[currentIndex]}
              questionNumber={currentIndex + 1}
              totalQuestions={QUESTIONS_PER_ROUND}
              onAnswer={handleAnswer}
              disabled={phase === 'feedback'}
              score={sessionScore}
              userName={user?.name ?? ''}
              soundEnabled={soundEnabled}
              onToggleSound={handleToggleSound}
            />
          )}

          {phase === 'feedback' && isCorrect !== null && (
            <FeedbackModal
              isCorrect={isCorrect}
              message={feedbackMsg}
              correctAnswerText={
                !isCorrect && questions[currentIndex]
                  ? questions[currentIndex].options[questions[currentIndex].correctAnswer]
                  : undefined
              }
              onClose={handleFeedbackClose}
            />
          )}

          {phase === 'round-results' && user && (
            <RoundResults
              correct={roundCorrect}
              wrong={roundWrong}
              score={roundScore}
              totalScore={sessionScore}
              userName={user.name}
              historicalTotal={user.totalScore}
              onContinue={handleContinue}
              onQuit={handleQuit}
              isLoading={isLoading}
              soundEnabled={soundEnabled}
              onToggleSound={handleToggleSound}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
