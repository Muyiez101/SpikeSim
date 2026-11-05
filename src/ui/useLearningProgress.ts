import { useEffect, useRef, useState } from 'react';
import { emptyLearning, learningKey, readLearning, type LearningProgress } from '../learn/progress';
import { browserStorage } from '../progress/storage';

type SaveState = 'saved' | 'failed' | 'invalid' | 'conflict';
export function useLearningProgress() {
  const [initial] = useState(() => {
    try {
      const raw = browserStorage.getItem(learningKey);
      const parsed = readLearning(raw);
      return { ...parsed, raw, failed: false };
    } catch {
      return { value: emptyLearning(), invalid: false, raw: null, failed: true };
    }
  });
  const [state, setState] = useState(initial.value),
    [status, setStatus] = useState<SaveState>(
      initial.invalid ? 'invalid' : initial.failed ? 'failed' : 'saved',
    );
  const current = useRef(state),
    saved = useRef(initial.raw),
    blocked = useRef(initial.invalid);
  const [resetKey, setResetKey] = useState(0);
  function persist(value: LearningProgress, force = false) {
    if (blocked.current && !force) return;
    try {
      if (!force && browserStorage.getItem(learningKey) !== saved.current) {
        setStatus('conflict');
        return;
      }
      const raw = JSON.stringify(value);
      browserStorage.setItem(learningKey, raw);
      saved.current = raw;
      blocked.current = false;
      setStatus('saved');
    } catch {
      setStatus('failed');
    }
  }
  function update(action: (previous: LearningProgress) => LearningProgress) {
    const next = action(current.current);
    current.current = next;
    setState(next);
    persist(next);
  }
  function useSaved() {
    try {
      const raw = browserStorage.getItem(learningKey),
        parsed = readLearning(raw);
      saved.current = raw;
      blocked.current = parsed.invalid;
      if (!parsed.invalid) {
        current.current = parsed.value;
        setState(parsed.value);
        setResetKey((key) => key + 1);
      }
      setStatus(parsed.invalid ? 'invalid' : 'saved');
    } catch {
      setStatus('failed');
    }
  }
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === learningKey || event.key === null) setStatus('conflict');
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);
  return {
    state,
    status,
    resetKey,
    update,
    retry: () => persist(current.current),
    replace: () => persist(current.current, true),
    useSaved,
  };
}
