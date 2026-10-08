import { useCallback, useEffect, useRef } from 'react';

/** Returns a debounced version of `callback`; pending calls are cancelled on unmount. */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number,
): (...args: TArgs) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useCallback(
    (...args: TArgs) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs],
  );
}
