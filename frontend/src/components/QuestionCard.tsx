import { useId } from 'react';
import type { Question } from '../types';

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (index: number) => void;
  disabled: boolean;
  score: number;
  userName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  disabled,
  score,
  userName,
  soundEnabled,
  onToggleSound,
}: Props) {
  const headingId = useId();
  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <div className="card question-card" role="main" aria-labelledby={headingId}>
      {/* Top bar: name + score + sound toggle */}
      <div className="qcard-topbar">
        <span className="qcard-player" aria-label={`Player: ${userName}`}>
          {userName}
        </span>
        <span className="qcard-score" aria-label={`Score: ${score} points`}>
          {score} pts
        </span>
        <button
          className="sound-toggle"
          onClick={onToggleSound}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Sound on – click to mute' : 'Sound off – click to unmute'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={questionNumber}
        aria-valuemin={1}
        aria-valuemax={totalQuestions}
        aria-label={`Question ${questionNumber} of ${totalQuestions}`}
      >
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="progress-label" aria-hidden="true">
        Question {questionNumber} / {totalQuestions}
      </p>

      {/* Category + difficulty badge */}
      <div className="qcard-meta">
        <span className="badge badge-category">{question.category}</span>
        <span className={`badge badge-difficulty badge-difficulty--${question.difficulty}`}>
          {DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}
        </span>
      </div>

      {/* Question text */}
      <h1 id={headingId} className="question-text">
        {question.text}
      </h1>

      {/* Answer options */}
      <ul className="options-list" role="list">
        {question.options.map((option, idx) => (
          <li key={idx} role="listitem">
            <button
              className="option-btn"
              onClick={() => onAnswer(idx)}
              disabled={disabled}
              aria-label={`Option ${idx + 1}: ${option}`}
            >
              <span className="option-letter" aria-hidden="true">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="option-text">{option}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
