"use client";

import { useEffect, useState } from "react";

interface BootSequenceProps {
  /** Lines to type out in order. */
  lines: string[];
  /** Milliseconds per character. Default 18ms. */
  charDelay?: number;
  /** Milliseconds between lines. Default 200ms. */
  lineDelay?: number;
  /** Marker prefix per line. Default `>` (terminal prompt). */
  prefix?: string;
  /** Color of the prefix. Default phosphor green. */
  prefixColor?: string;
  /** Color of the text. Default text-muted. */
  textColor?: string;
  /** Show a blinking cursor at the end after everything types out. */
  cursor?: boolean;
  className?: string;
}

/**
 * Typewriter animation that types each line character-by-character,
 * pauses, then advances to the next. Ends with optional blinking
 * cursor. Pure aesthetic — used in landing hero and demo loading.
 */
export default function BootSequence({
  lines,
  charDelay = 18,
  lineDelay = 200,
  prefix = ">",
  prefixColor = "var(--color-matrix)",
  textColor = "var(--color-text-muted)",
  cursor = true,
  className = "",
}: BootSequenceProps) {
  const [shown, setShown] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let lineIdx = 0;
    let charIdx = 0;
    const next: string[] = lines.map(() => "");

    function step() {
      if (cancelled) return;
      if (lineIdx >= lines.length) {
        setDone(true);
        return;
      }
      const fullLine = lines[lineIdx];
      if (charIdx <= fullLine.length) {
        next[lineIdx] = fullLine.slice(0, charIdx);
        setShown([...next]);
        charIdx += 1;
        setTimeout(step, charDelay);
      } else {
        lineIdx += 1;
        charIdx = 0;
        setTimeout(step, lineDelay);
      }
    }
    step();

    return () => {
      cancelled = true;
    };
  }, [lines, charDelay, lineDelay]);

  return (
    <div
      className={`font-[family-name:var(--font-mono)] text-sm leading-relaxed ${className}`}
    >
      {shown.map((line, i) => (
        <div key={i} className="flex gap-2">
          <span style={{ color: prefixColor }}>{prefix}</span>
          <span style={{ color: textColor }}>{line}</span>
        </div>
      ))}
      {done && cursor && (
        <div className="flex gap-2">
          <span style={{ color: prefixColor }}>{prefix}</span>
          <span
            className="cursor-blink"
            style={{ color: "var(--color-matrix)" }}
          >
            ▊
          </span>
        </div>
      )}
    </div>
  );
}
