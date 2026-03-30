"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const ANIMATION_INTERVAL_MS = 1200;

export function useTimeline(minYear: number, maxYear: number) {
  const [currentYear, setCurrentYear] = useState(maxYear);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const setYear = useCallback(
    (year: number) => {
      setCurrentYear(Math.max(minYear, Math.min(maxYear, year)));
      // Pause when user manually sets year
      setIsPlaying(false);
      clearTimer();
    },
    [minYear, maxYear, clearTimer],
  );

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        // If at the end, restart from beginning
        setCurrentYear((y) => (y >= maxYear ? minYear : y));
      }
      return !prev;
    });
  }, [minYear, maxYear]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentYear((prev) => {
          if (prev >= maxYear) {
            setIsPlaying(false);
            return maxYear;
          }
          return prev + 1;
        });
      }, ANIMATION_INTERVAL_MS);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPlaying, maxYear, clearTimer]);

  return { currentYear, isPlaying, setYear, togglePlay, minYear, maxYear };
}
