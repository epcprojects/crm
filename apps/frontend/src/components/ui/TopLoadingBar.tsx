'use client';

import { useEffect, useRef, useState } from 'react';

type TopLoadingBarProps = {
  visible?: boolean;
  className?: string;
};

export default function TopLoadingBar({
  visible = true,
  className = '',
}: TopLoadingBarProps) {
  const [isRendered, setIsRendered] = useState(visible);
  const [progress, setProgress] = useState(visible ? 12 : 0);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (visible) {
      setIsRendered(true);
      setProgress((current) => (current > 5 && current < 95 ? current : 12));

      const intervalId = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 92) {
            return current;
          }

          const remaining = 92 - current;
          const step = Math.max(remaining * 0.18, 1.5);

          return Math.min(92, current + step);
        });
      }, 140);

      return () => {
        window.clearInterval(intervalId);
      };
    }

    setProgress(100);
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsRendered(false);
      setProgress(0);
      hideTimeoutRef.current = null;
    }, 220);

    return () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [visible]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[120] h-1 overflow-hidden bg-red-100 ${className}`.trim()}
      aria-hidden="true"
    >
      <div
        className="h-full bg-purple-500 transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
