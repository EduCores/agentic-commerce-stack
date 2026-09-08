"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChatBubble } from "./chat-bubble";

type Msg = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean };

export function AdminChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", text: "¡Hola Dueño! Soy Star Admin Ops — mismo estilo StarShop pero para operar. Pregúntame: ¿cuánto vendí hoy? | stock bajo | pedidos con alerta | crea producto" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
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

  useEffect(() => {
    try { const v = localStorage.getItem("acs-voiceOn"); if (v === "1") setVoiceOn(true); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("acs-voiceOn", voiceOn ? "1" : "0"); } catch {}
    if (!voiceOn) try { audioRef.current?.pause(); } catch {}
  }, [voiceOn]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text };
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", text: "", streaming: true }]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 280));
    try {
      // Fuerza admin_ops: manda history y el backend detectará admin_ops, pero si no, forzamos via prompt
      const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, storeId: "seed-store" }),
      });
      const j = await r.json();
      const final = j.text ?? "";
      // Si no fue admin_ops, reintenta forzando el crew admin via direct call
      let displayText = final;
      let isAdmin = j.crew === "starshop-admin-ops" || j.detectedIntent === "admin_ops";
      if (!isAdmin && /vendí|ventas|stock bajo|pedidos con alerta|crea producto/i.test(text)) {
        // Fallback: llama directo al crew admin via stream
        const r2 = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history, storeId: "seed-store", useFlow: true }),
        });
        if (r2.ok && r2.body) {
          const reader = r2.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          let full = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() ?? "";
            for (const p of parts) {
              if (!p.startsWith("data:")) continue;
              const e = JSON.parse(p.slice(5).trim());
              if (e.type === "text" && e.text) { full += e.text; setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: full } : x))); }
              if (e.type === "done" && e.text) full = e.text;
            }
          }
          displayText = full || final;
          setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: displayText, streaming: false } : x)));
          if (displayText) speak(displayText);
          return;
        }
      }
      setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: displayText, streaming: false } : x)));
      if (displayText) speak(displayText);
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: `Error: ${e instanceof Error ? e.message : String(e)}`, streaming: false } : x)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex h-[620px] flex-col border-brand-200">
      <CardHeader className="shrink-0 border-b border-card-border bg-brand-500/10">
        <CardTitle className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
          Star Admin Ops — Dueño
          <span className="ml-auto flex items-center gap-2">
            <button onClick={() => setVoiceOn((v) => !v)} title={voiceOn ? "Voz ON" : "Voz OFF"} className={`rounded-full px-2 py-1 text-xs ${voiceOn ? "bg-black text-white" : "bg-zinc-100 text-zinc-600"}`}>{voiceOn ? "🔊 Voz" : "🔇 Voz"}</button>
            <span className="hidden sm:inline text-xs font-normal text-text-tertiary">mismo estilo StarShop</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent ref={listRef} className="flex-1 overflow-y-auto space-y-3 p-4 bg-background-gray-secondary_alt_2">
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} text={m.text} streaming={m.streaming} isTyping={loading && m.role === "assistant" && !m.text} />
        ))}
      </CardContent>
      <div className="shrink-0 border-t border-card-border p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="¿cuánto vendí hoy?  ·  stock bajo  ·  pedidos con alerta"
          className="flex-1 rounded-xl border border-card-border bg-card-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
          disabled={loading}
        />
        <Button onClick={send} isDisabled={loading || !input.trim()} appearance="fill" className="shrink-0">
          {loading ? "..." : "Enviar"}
        </Button>
      </div>
    </Card>
  );
}
