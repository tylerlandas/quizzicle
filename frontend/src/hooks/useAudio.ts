import { useRef, useCallback, useEffect } from 'react';

export function useAudio(enabled: boolean) {
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const audioContextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback((): AudioContext => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playNote = useCallback(
    (
      ctx: AudioContext,
      frequency: number,
      startTime: number,
      duration: number,
      gainValue = 0.28,
      type: OscillatorType = 'sine'
    ) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
      gainNode.gain.setValueAtTime(gainValue, startTime + duration * 0.7);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.01);
    },
    []
  );

  /** Ascending C-major fanfare — triumphant little jingle */
  const playHappyMusic = useCallback(() => {
    if (!enabledRef.current) return;
    const ctx = getContext();
    const t = ctx.currentTime;

    // Melody: C5 E5 G5 C6 (rapid ascent then held chord)
    const melody: [number, number, number][] = [
      [523.25, 0.0, 0.14],
      [659.25, 0.14, 0.14],
      [783.99, 0.28, 0.14],
      [1046.5, 0.42, 0.45],
    ];
    melody.forEach(([freq, offset, dur]) =>
      playNote(ctx, freq, t + offset, dur, 0.25, 'triangle')
    );

    // Soft chord backing at the end
    [523.25, 659.25, 783.99].forEach((freq) =>
      playNote(ctx, freq, t + 0.42, 0.5, 0.08, 'sine')
    );
  }, [getContext, playNote]);

  /** Descending "wah-wah" — sad trombone vibes */
  const playSadMusic = useCallback(() => {
    if (!enabledRef.current) return;
    const ctx = getContext();
    const t = ctx.currentTime;

    const melody: [number, number, number][] = [
      [466.16, 0.0, 0.28],
      [415.3, 0.28, 0.28],
      [369.99, 0.56, 0.28],
      [311.13, 0.84, 0.7],
    ];
    melody.forEach(([freq, offset, dur]) =>
      playNote(ctx, freq, t + offset, dur, 0.3, 'sawtooth')
    );
  }, [getContext, playNote]);

  return { playHappyMusic, playSadMusic };
}
