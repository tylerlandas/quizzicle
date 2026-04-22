import { useEffect, useRef } from 'react';

interface Props {
  correct: number;
  wrong: number;
  score: number;
  totalScore: number;
  userName: string;
  historicalTotal: number;
  onContinue: () => void;
  onQuit: () => void;
  isLoading: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function RoundResults({
  correct,
  wrong,
  score,
  totalScore,
  userName,
  historicalTotal,
  onContinue,
  onQuit,
  isLoading,
  soundEnabled,
  onToggleSound,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the heading when results appear
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const total = correct + wrong;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  let verdict = '';
  if (pct === 100) verdict = 'Flawless victory! Are you human?!';
  else if (pct >= 80) verdict = 'Outstanding! Your brain is basically XL.';
  else if (pct >= 60) verdict = 'Not bad! The couch potato has some neurons.';
  else if (pct >= 40) verdict = 'You tried! And trying is... something.';
  else verdict = 'Yikes. Maybe try a round of "which color is the sky" first.';

  return (
    <div className="card results-card" role="main" aria-labelledby="results-heading">
      <h1
        ref={headingRef}
        id="results-heading"
        className="results-heading"
        tabIndex={-1}
      >
        Round Over, {userName}!
      </h1>
      <p className="results-verdict" aria-live="polite">
        {verdict}
      </p>

      {/* Stats grid */}
      <dl className="stats-grid">
        <div className="stat-item stat-item--correct">
          <dt>Correct</dt>
          <dd aria-label={`${correct} correct answers`}>{correct}</dd>
        </div>
        <div className="stat-item stat-item--wrong">
          <dt>Wrong</dt>
          <dd aria-label={`${wrong} wrong answers`}>{wrong}</dd>
        </div>
        <div className="stat-item stat-item--pct">
          <dt>Accuracy</dt>
          <dd aria-label={`${pct} percent accuracy`}>{pct}%</dd>
        </div>
      </dl>

      {/* Score breakdown */}
      <div className="score-breakdown" aria-label="Score breakdown">
        <div className="score-row">
          <span>Round score</span>
          <span className="score-value">+{score} pts</span>
        </div>
        <div className="score-row">
          <span>Session total</span>
          <span className="score-value">{totalScore} pts</span>
        </div>
        <div className="score-row score-row--alltime">
          <span>All-time best</span>
          <span className="score-value">{historicalTotal + totalScore} pts</span>
        </div>
      </div>

      {/* Sound toggle */}
      <div className="results-sound">
        <button
          className="sound-toggle sound-toggle--labeled"
          onClick={onToggleSound}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Sound on – click to mute' : 'Sound off – click to unmute'}
        >
          <span aria-hidden="true">{soundEnabled ? '🔊' : '🔇'}</span>
          <span>{soundEnabled ? 'Sound on' : 'Sound off'}</span>
        </button>
      </div>

      {/* Actions */}
      <div className="results-actions">
        <button
          className="btn btn-primary"
          onClick={onContinue}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label="Play another round of 5 questions"
        >
          {isLoading ? 'Loading…' : 'Another Round!'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onQuit}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label="Save score and quit"
        >
          {isLoading ? 'Saving…' : 'Save & Quit'}
        </button>
      </div>
    </div>
  );
}
