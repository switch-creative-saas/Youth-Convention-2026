import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(target: number, duration: number = 1200, startOnMount: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const start = () => {
    if (hasStarted) return;
    setHasStarted(true);
    startTimeRef.current = null;
  };

  useEffect(() => {
    if (!startOnMount && !hasStarted) return;
    if (startOnMount && !hasStarted) setHasStarted(true);
    if (!hasStarted && !startOnMount) return;

    const easeOutQuad = (t: number) => t * (2 - t);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(progress);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, hasStarted, startOnMount]);

  return { count, start };
}
