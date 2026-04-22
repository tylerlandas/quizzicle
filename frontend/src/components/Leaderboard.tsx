import { useEffect, useRef, useCallback } from 'react';
import type { LeaderboardEntry } from '../services/api';

interface Props {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ entries, isLoading, error, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    },
    [onClose]
  );

  return (
    <div className="modal-overlay" aria-modal="true" role="dialog" aria-label="Leaderboard">
      <div
        ref={dialogRef}
        className="leaderboard-modal"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="leaderboard-header">
          <h2 className="leaderboard-title">🏆 Leaderboard</h2>
          <button
            ref={closeRef}
            className="leaderboard-close"
            onClick={onClose}
            aria-label="Close leaderboard"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="leaderboard-status" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <span>Loading scores…</span>
          </div>
        )}

        {error && (
          <p className="leaderboard-error" role="alert">{error}</p>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <p className="leaderboard-empty">No scores yet — be the first!</p>
        )}

        {!isLoading && !error && entries.length > 0 && (
          <ol className="leaderboard-list" aria-label="Players ranked by score">
            {entries.map((entry, i) => (
              <li key={entry._id} className={`leaderboard-row${i < 3 ? ' leaderboard-row--top' : ''}`}>
                <span className="leaderboard-rank" aria-label={`Rank ${i + 1}`}>
                  {MEDALS[i] ?? <span className="leaderboard-rank-num">{i + 1}</span>}
                </span>
                <span className="leaderboard-name">{entry.name}</span>
                <span className="leaderboard-score">{entry.totalScore.toLocaleString()}</span>
                <span className="leaderboard-games">
                  {entry.gamesPlayed} {entry.gamesPlayed === 1 ? 'game' : 'games'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
