import { useState, useId, useRef, useEffect } from 'react';

interface Props {
  onSubmit: (name: string) => void;
  isLoading: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenLeaderboard: () => void;
}

export default function NameEntry({ onSubmit, isLoading, soundEnabled, onToggleSound, onOpenLeaderboard }: Props) {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const errorId = useId();
  const soundId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = name.trim();
  const hasError = touched && trimmed.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (trimmed.length > 0) {
      onSubmit(trimmed);
    }
  };

  return (
    <div className="card name-entry-card">
      {/* Logo heading */}
      <div className="logo-header" aria-label="Quizzicle">
        <span className="logo-q">Q</span>
        <span className="logo-u">U</span>
        <span className="logo-i">I</span>
        <span className="logo-z1">Z</span>
        <span className="logo-z2">Z</span>
        <span className="logo-i2">I</span>
        <span className="logo-c">C</span>
        <span className="logo-l">L</span>
        <span className="logo-e">E</span>
      </div>
      <p className="logo-tagline" aria-label="The trivia game that'll make you feel smart... or not!">
        The trivia game that'll make you feel smart… or not!
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor={inputId} className="form-label">
            What's your name, trivia champion?
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            className={`form-input${hasError ? ' form-input--error' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Enter your name…"
            maxLength={40}
            autoComplete="given-name"
            aria-required="true"
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            disabled={isLoading}
          />
          {hasError && (
            <p id={errorId} className="form-error" role="alert">
              Please enter your name to continue.
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Loading…' : "Let's Play!"}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-full leaderboard-btn"
          onClick={onOpenLeaderboard}
          disabled={isLoading}
        >
          🏆 Leaderboard
        </button>

        <div className="sound-check">
          <input
            type="checkbox"
            id={soundId}
            className="sound-check__input"
            checked={soundEnabled}
            onChange={onToggleSound}
            disabled={isLoading}
          />
          <label htmlFor={soundId} className="sound-check__label">
            {soundEnabled ? '🔊' : '🔇'} Sound effects
          </label>
        </div>
      </form>
    </div>
  );
}
