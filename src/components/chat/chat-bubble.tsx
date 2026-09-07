"use client";

import { cn } from "@/utils/cn";
import { useTypewriter, TypingIndicator } from "./use-typewriter";

type BubbleProps = {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean; // true si viene de SSE (ya tipeando real)
  isTyping?: boolean; // muestra dots mientras espera primer chunk
  className?: string;
};

export function ChatBubble({ role, text, streaming, isTyping, className }: BubbleProps) {
  // Si es streaming real, muestra el texto tal cual llega (el SSE ya es tipeo)
  // Si es JSON completo, anima con typewriter para parecer IA
  const { displayed, done } = useTypewriter(text, { enabled: !streaming && role === "assistant", speedMs: 14, chunkSize: 3 });

  const shown = streaming ? text : role === "assistant" ? displayed : text;

  if (isTyping && !text) {
    return (
      <div className={cn("flex justify-start", className)}>
        <TypingIndicator />
      </div>
    );
  }

  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start", className)}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
          role === "user" ? "bg-brand-500 text-white rounded-br-md" : "bg-card-background border border-card-border text-text-primary rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {shown}
          {!done && role === "assistant" && !streaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-text-tertiary align-middle" />}
        </p>
      </div>
    </div>
  );
}
