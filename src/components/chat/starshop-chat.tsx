"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChatBubble } from "./chat-bubble";
type Msg = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean; crew?: string; detectedIntent?: string };
type ToolCall = { toolName: string; args: Record<string, unknown>; output: unknown };
export function StarShopChat({ apiUrl = "/api/chat/stream" }: { apiUrl?: string }) {
  const [messages, setMessages] = useState<Msg[]>([{ id: "welcome", role: "assistant", text: "¡Hola! Soy Star, tu asistente de StarShop 😊 ¿Qué estás buscando hoy? Herramientas, iluminación LED, medición..." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stickRef = useRef(true);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);
  const speak = async (text: string) => {
    if (!voiceOn) return;
    try { audioRef.current?.pause(); audioRef.current = null; } catch {}
    const clean = text.replace(/[*#_]/g, "").slice(0, 900);
    try {
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean }) });
      if (!r.ok || !r.headers.get("content-type")?.includes("audio")) return;
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => { audioRef.current = null; };
      await a.play();
    } catch {}
  };
  useEffect(() => { try { const v = localStorage.getItem("acs-voiceOn"); if (v === "1") setVoiceOn(true); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("acs-voiceOn", voiceOn ? "1" : "0"); } catch {} if (!voiceOn) try { audioRef.current?.pause(); } catch {} }, [voiceOn]);
  async function send(streaming = true) {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text };
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", text: "", streaming }]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 280));
    try {
      if (streaming) {
        // Envía el historial reciente como turnos con role para que Star recuerde la conversación
        const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
        const r = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history, storeId: "seed-store" }) });
        if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let full = "";
        let crew: string | undefined;
        let detectedIntent: string | undefined;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            try {
              const evt = JSON.parse(json) as { type: string; text?: string; detectedIntent?: string; crew?: string; toolCalls?: ToolCall[] };
              if (evt.type === "meta") { crew = evt.crew; detectedIntent = evt.detectedIntent; }
              else if (evt.type === "text" && evt.text) { full += evt.text; setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: full, crew, detectedIntent, streaming: true } : x))); }
              else if (evt.type === "done") {
                if (evt.text && evt.text !== full) full = evt.text;
                const nav = (evt.toolCalls as unknown as ToolCall[] | undefined)?.find((t) => t.toolName === "navigateTo");
                const path = (nav?.output as { navigateTo?: string } | undefined)?.navigateTo ?? (nav?.args as { path?: string } | undefined)?.path;
                if (path) { setTimeout(() => { window.location.href = path; }, 900); }
                const final = full || evt.text || "";
                setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: final, crew, detectedIntent, streaming: false } : x)));
                if (final) speak(final);
              }
            } catch {}
          }
        }
      } else {
        const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
        const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history, storeId: "seed-store" }) });
        const j = await r.json();
        const nav = (j.toolCalls as ToolCall[] | undefined)?.find((t) => t.toolName === "navigateTo");
        const path = (nav?.output as { navigateTo?: string } | undefined)?.navigateTo;
        const finalJ = j.text ?? "";
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: finalJ, crew: j.crew, detectedIntent: j.detectedIntent, streaming: false } : x)));
        if (finalJ) speak(finalJ);
        if (path) setTimeout(() => { window.location.href = path; }, 900);
      }
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: `Error: ${e instanceof Error ? e.message : String(e)}`, streaming: false } : x)));
    } finally { setLoading(false); }
  }
  return (
    <Card className="flex h-[560px] flex-col overflow-hidden border-0 shadow-none">
      <CardHeader className="shrink-0 bg-[rgb(255_216_20)] text-black px-4 py-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-black"><span className="h-2 w-2 animate-pulse rounded-full bg-black" /> Star — Asistente IA</CardTitle>
        <button onClick={() => setVoiceOn((v) => !v)} title={voiceOn ? "Voz ON (toca para silenciar)" : "Voz OFF"} className={`rounded-full px-2 py-1 text-xs ${voiceOn ? "bg-black text-white" : "bg-white/70 text-black"}`}>{voiceOn ? "🔊 Voz" : "🔇 Voz"}</button>
      </CardHeader>
      <CardContent ref={listRef} className="flex-1 overflow-y-auto space-y-3 p-3 bg-white">
        {messages.map((m) => (<ChatBubble key={m.id} role={m.role} text={m.text} streaming={m.streaming} isTyping={loading && m.role === "assistant" && !m.text} />))}
      </CardContent>
      <div className="shrink-0 border-t p-3 flex gap-2 bg-white">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(true); } }} placeholder="Escribe: quiero ver taladros, compara precios..." className="flex-1 rounded-full border border-card-border bg-input-background px-4 py-2 text-sm text-text-primary [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[rgb(255_216_20)] dark:[color-scheme:dark]" disabled={loading} />
        <Button onClick={() => send(true)} isDisabled={loading || !input.trim()} appearance="fill" className="shrink-0 bg-[rgb(255_216_20)] text-black hover:bg-[rgb(247_202_0)] border-0">{loading ? "..." : "Enviar"}</Button>
      </div>
    </Card>
  );
}
