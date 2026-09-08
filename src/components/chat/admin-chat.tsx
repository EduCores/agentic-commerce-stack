"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChatBubble } from "./chat-bubble";

type Msg = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean };

export function AdminChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", text: "¡Hola Dueño! 👋 Soy Star Admin Ops. ¿Qué necesitas hoy?\n\n• ¿Cuánto vendí hoy?\n• Stock bajo\n• Pedidos con alerta\n• Crea producto\n\nTe llevo a /products | /orders | /workflows" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sigue el tipeo sin tiriteo: scroll instantáneo solo si el usuario está al fondo.
  // (smooth en cada letra encadena animaciones que pelean entre sí y hacen temblar el chat)
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
  // Sigue también el crecimiento letra a letra del typewriter (los messages no cambian por letra)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stickRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      // Endpoint dedicado admin: siempre admin_ops, sin heurística ni flag
      const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const r = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, storeId: "seed-store" }),
      });
      if (r.status === 401) {
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: "Sesión expirada. Recarga e inicia sesión de nuevo.", streaming: false } : x)));
        return;
      }
      const j = await r.json();
      const displayText = j.text ?? j.error ?? "Sin respuesta.";
      setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: displayText, streaming: false } : x)));
      if (displayText) speak(displayText);
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, text: `Error: ${e instanceof Error ? e.message : String(e)}`, streaming: false } : x)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex h-[620px] flex-col overflow-hidden border-0 shadow-none">
      <CardHeader className="shrink-0 bg-[rgb(255_216_20)] text-black px-4 py-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-black">
          <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
          Star Admin Ops — Dueño
        </CardTitle>
        <button onClick={() => setVoiceOn((v) => !v)} title={voiceOn ? "Voz ON (toca para silenciar)" : "Voz OFF"} className={`rounded-full px-2 py-1 text-xs ${voiceOn ? "bg-black text-white" : "bg-white/70 text-black"}`}>{voiceOn ? "🔊 Voz" : "🔇 Voz"}</button>
      </CardHeader>
      <CardContent ref={listRef} className="flex-1 overflow-y-auto space-y-3 p-3 bg-white">
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} text={m.text} streaming={m.streaming} isTyping={loading && m.role === "assistant" && !m.text} />
        ))}
      </CardContent>
      <div className="shrink-0 border-t p-3 flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="¿cuánto vendí hoy?  ·  stock bajo  ·  pedidos con alerta"
          className="flex-1 rounded-full border border-card-border bg-input-background px-4 py-2 text-sm text-text-primary [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[rgb(255_216_20)] dark:[color-scheme:dark]"
          disabled={loading}
        />
        <Button onClick={send} isDisabled={loading || !input.trim()} appearance="fill" className="shrink-0 bg-[rgb(255_216_20)] text-black hover:bg-[rgb(247_202_0)] border-0">
          {loading ? "..." : "Enviar"}
        </Button>
      </div>
    </Card>
  );
}
