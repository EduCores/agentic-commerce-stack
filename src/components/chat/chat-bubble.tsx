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
  // Siempre tipeo IA: incluso streaming SSE se anima Char-by-char para que se note
  // streaming solo indica que el texto viene por chunks, pero igual pasa por typewriter
  const isAssistant = role === "assistant";
  const { displayed, done } = useTypewriter(text, { enabled: isAssistant, speedMs: streaming ? 12 : 16, chunkSize: streaming ? 1 : 2 });

  const shown = isAssistant ? displayed : text;

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
          {!done && isAssistant && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brand-500 align-middle" />}
        </p>
      </div>
    </div>
  );
}
