"use client";
import { useEffect, useState } from "react";
export function useTypewriter(fullText: string, opts?: { speedMs?: number; chunkSize?: number; enabled?: boolean }) {
  const speedMs = opts?.speedMs ?? 35;
  const chunkSize = opts?.chunkSize ?? 1;
  const enabled = opts?.enabled ?? true;
  const [displayed, setDisplayed] = useState(enabled ? "" : fullText);
  const [done, setDone] = useState(!enabled);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      if (!enabled) {
        setDisplayed(fullText);
        setDone(true);
        return;
      }
      if (!fullText) {
        setDisplayed("");
        setDone(false);
        return;
      }
      setDisplayed("");
      setDone(false);
      let idx = 0;
      interval = setInterval(() => {
        idx = Math.min(idx + chunkSize, fullText.length);
        setDisplayed(fullText.slice(0, idx));
        if (idx >= fullText.length) {
          setDone(true);
          if (interval) clearInterval(interval);
        }
      }, speedMs);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [fullText, speedMs, chunkSize, enabled]);
  return { displayed, done };
}
export function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 rounded-2xl bg-card-background px-3 py-2">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: "300ms" }} />
    </span>
  );
}
