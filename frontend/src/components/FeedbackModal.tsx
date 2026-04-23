import { useEffect, useRef, useCallback } from 'react';

interface Props {
  isCorrect: boolean;
  message: string;
  correctAnswerText?: string;
  onClose: () => void;
}

/** WCAG 2.2 compliant modal dialog with focus trap and auto-dismiss */
export default function FeedbackModal({ isCorrect, message, correctAnswerText, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button on open
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Focus trap within modal
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
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  return (
    <div
      className="modal-overlay"
      aria-modal="true"
      role="dialog"
      aria-label={isCorrect ? 'Correct answer!' : 'Wrong answer'}
    >
      <div
        ref={dialogRef}
        className={`feedback-modal ${isCorrect ? 'feedback-modal--correct' : 'feedback-modal--wrong'}`}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        aria-live="assertive"
      >
        <div className="feedback-icon" aria-hidden="true">
          {isCorrect ? '🎉' : '😬'}
        </div>
        <h2 className="feedback-heading">
          {isCorrect ? 'Correct!' : 'Wrong!'}
        </h2>
        <p className="feedback-message">{message}</p>
        {!isCorrect && correctAnswerText && (
          <p className="feedback-correct-answer">
            <span className="feedback-correct-answer__label">Correct answer: </span>
            {correctAnswerText}
          </p>
        )}

        <button
          ref={closeRef}
          className="btn btn-primary"
          onClick={onClose}
          aria-label="Continue to next question"
        >
          Continue
        </button>

        <p className="feedback-hint" aria-live="polite">
          (press Escape or Continue)
        </p>
      </div>
    </div>
  );
}
