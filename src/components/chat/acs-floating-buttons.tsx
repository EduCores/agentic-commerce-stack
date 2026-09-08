"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowUp, Bot, X, Send, Sparkles, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getTeamWhatsAppLink, memberWaLink } from "@/lib/whatsapp";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export function ACSFloatingButtons() {
  const [showTop, setShowTop] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState<{ role: "user" | "agent"; text: string }[]>([
    { role: "agent", text: "¡Hola Dueño! Soy Star Admin Ops — opero tu tienda. Pregúntame: ¿cuánto vendí hoy? | stock bajo | pedidos con alerta" },
  ]);
  const [agentTyping, setAgentTyping] = useState(false);
  const [agentPulse, setAgentPulse] = useState(0);
  const [agentListening, setAgentListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const agentScrollRef = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // WhatsApp del EQUIPO (admin). El de clientes vive en la tienda (NEXT_PUBLIC_WHATSAPP_STORE).
  const teamWa = getTeamWhatsAppLink();
  // Roster sincronizado con /manage-team: agregar teléfono lo activa, borrarlo o eliminar miembro lo saca.
  const [waOpen, setWaOpen] = useState(false);
  const [teamPhones, setTeamPhones] = useState<{ name: string | null; phone: string }[]>([]);
  useEffect(() => {
    fetch("/api/admin/team")
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((j) => setTeamPhones((j.members ?? []).filter((m: { phone?: string | null }) => m.phone).map((m: { name: string | null; phone: string }) => ({ name: m.name, phone: m.phone }))))
      .catch(() => {});
  }, [agentOpen, waOpen]);

  const typeAgentMessage = (full: string) => {
    setAgentMessages((m) => [...(m as any), { role: "agent", text: "" }]);
    let idx = 0;
    const t = setInterval(() => {
      idx = Math.min(idx + 2, full.length);
      setAgentMessages((curr: any) => {
        const copy = [...curr];
        const last = copy.length - 1;
        if (last >= 0 && copy[last].role === "agent") copy[last] = { ...copy[last], text: full.slice(0, idx) };
        return copy;
      });
      if (idx >= full.length) { clearInterval(t); if (voiceOn) speak(full); }
    }, 28);
  };

  const speak = async (text: string, id?: number) => {
    try {
      stopSpeak();
      const clean = text.replace(/[*#_]/g, "").slice(0, 900);
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean }) });
      if (!r.ok || !r.headers.get("content-type")?.includes("audio")) return;
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      if (id !== undefined) setSpeakingId(id);
      audio.onended = () => { setSpeakingId(null); audioRef.current = null; };
      audio.onpause = () => setSpeakingId(null);
      await audio.play();
    } catch {}
  };

  const stopSpeak = () => {
    try { audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0; audioRef.current = null; } catch {}
    setSpeakingId(null);
    try { document.querySelectorAll("audio").forEach((a) => (a as HTMLAudioElement).pause()); } catch {}
  };

  useEffect(() => {
    const v = localStorage.getItem("starshop-voiceOn");
    if (v === "1") setVoiceOn(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("starshop-voiceOn", voiceOn ? "1" : "0");
    if (!voiceOn) stopSpeak();
  }, [voiceOn]);

  // Scroll instantáneo solo al fondo (smooth cada 28ms = tiriteo)
  const stickRef = useRef(true);
  useEffect(() => {
    const el = agentScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = agentScrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [agentMessages, agentTyping]);

  const getAgentReply = async (input: string, history: { role: string; text: string }[] = []): Promise<{ text: string; navigateTo?: string }> => {
    try {
      const r = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: history.slice(-8), storeId: "seed-store" }),
      });
      if (r.status === 401) return { text: "Sesión expirada. Recarga e inicia sesión de nuevo." };
      const data = await r.json();
      const calls = data.toolCalls ?? [];
      const nav = calls.find((t: any) => t.toolName === "navigateTo");
      const navigateTo = nav?.output?.navigateTo ?? nav?.args?.path;
      if (data.text) return { text: data.text, navigateTo };
      if (navigateTo) return { text: "Te llevo a la tienda.", navigateTo };
      return { text: data.error ? `Error: ${data.error}` : "Sin respuesta." };
    } catch {
      return { text: "Error: no pude conectar con ACS." };
    }
  };

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleAgentVoice = () => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { typeAgentMessage("Tu navegador no soporta voz. Usa Chrome/Edge."); return; }
    if (agentListening) { try { recognitionRef.current?.stop(); } catch {} setAgentListening(false); return; }
    setAgentInput("");
    const recognition = new SR();
    recognition.lang = "es-CL"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => {
      const transcript = (e.results?.[0]?.[0]?.transcript ?? "").trim();
      try { recognition.stop(); } catch {}
      if (transcript) { setAgentInput(transcript); window.setTimeout(() => sendAgent(transcript), 150); }
    };
    recognition.onend = () => setAgentListening(false);
    recognition.onerror = (e: any) => { setAgentListening(false); if (e?.error && !["aborted","no-speech","not-allowed"].includes(e.error)) typeAgentMessage(`No pude captar tu voz (${e.error}).`); };
    recognitionRef.current = recognition;
    try { recognition.start(); setAgentListening(true); } catch { setAgentListening(false); }
  };

  const sendAgent = async (override?: string) => {
    const t = (override ?? agentInput).trim();
    if (!t) return;
    setAgentMessages((m) => [...m, { role: "user", text: t }]);
    setAgentInput(""); setAgentTyping(true);
    await new Promise((r) => setTimeout(r, 280));
    const historyForLLM = agentMessages.slice(-8);
    const { text, navigateTo } = await getAgentReply(t, historyForLLM as any);
    setAgentTyping(false);
    typeAgentMessage(text);
    if (navigateTo) setTimeout(() => { window.location.href = navigateTo; }, 1200);
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {showTop && (
          <motion.button initial={{ opacity: 0, y: 16, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.8 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="h-11 w-11 md:h-12 md:w-12 rounded-full bg-[#232F3E] text-white shadow-lg flex items-center justify-center hover:bg-[#0F1111] transition-colors" aria-label="Volver arriba">
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
      <motion.button key={`agent-${agentPulse}`} onClick={() => setAgentOpen(!agentOpen)} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 18 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`relative h-[67px] w-[67px] md:h-16 md:w-16 rounded-full bg-[rgb(255_216_20)] text-black shadow-xl flex items-center justify-center hover:bg-[rgb(247_202_0)] transition-colors ${agentPulse ? "animate-wiggle" : ""}`} aria-label="Agente IA">
        <span className="absolute inset-0 rounded-full bg-[rgb(255_216_20)] animate-ping opacity-20" aria-hidden />
        <Bot className="h-8 w-8 md:h-8 md:w-8 relative" />
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-400 rounded-full border-2 border-white" aria-hidden />
        <AnimatePresence>
          {agentPulse > 0 && (
            <motion.span key={agentPulse} initial={{ opacity: 0, scale: 0.5, y: 0 }} animate={{ opacity: 1, scale: 1, y: -12 }} exit={{ opacity: 0, y: -20 }} className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none">
              <Sparkles className="h-4 w-4 text-[#FFD814]" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {agentOpen && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.95 }} className="w-[320px] md:w-[360px] h-[440px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border overflow-hidden flex flex-col">
            <div className="bg-[rgb(255_216_20)] text-black px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm"><Bot className="h-5 w-5" /> Agente Starshop</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setVoiceOn((v) => !v)} title={voiceOn ? "Voz activada (toca para silenciar)" : "Activar voz del agente"} aria-label="Voz" className={`p-1.5 rounded ${voiceOn ? "bg-black text-white" : "hover:bg-white/20"}`}>{voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
                <button onClick={() => setAgentOpen(false)} className="p-1 hover:bg-white/20 rounded" aria-label="Cerrar"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="text-[11px] bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-3 py-2 flex items-center gap-2"><span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" /> ACS activo</div>
            <div ref={agentScrollRef} className="flex-1 min-h-0 overflow-y-auto [overflow-anchor:none] [scrollbar-gutter:stable] p-3 space-y-2">
              {agentMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm flex items-end gap-1 ${m.role === "user" ? "bg-[rgb(255_216_20)] text-black" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100"}`}>
                    <span className="flex-1 whitespace-pre-wrap break-words">{m.text}</span>
                    {m.role === "agent" && m.text && (
                      <button onClick={() => (speakingId === i ? stopSpeak() : speak(m.text, i))} title={speakingId === i ? "Detener voz" : "Escuchar"} className={`ml-1 shrink-0 rounded-full p-1 ${speakingId === i ? "bg-red-500 text-white animate-pulse" : "bg-white/70 hover:bg-white text-zinc-600"}`}><Volume2 className="h-3 w-3" /></button>
                    )}
                  </div>
                </div>
              ))}
              {agentTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-3 py-2 text-sm flex gap-1 items-center">
                    <span className="h-2 w-2 bg-zinc-400 rounded-full animate-bounce" /><span className="h-2 w-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" /><span className="h-2 w-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
            <div className="border-t p-2 flex gap-2">
              <input value={agentInput} onChange={(e) => setAgentInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendAgent()} placeholder={agentListening ? "Escuchando... habla ahora" : "Ej: busca proyector LED o panel 36W..."} className="flex-1 rounded-full border border-card-border bg-input-background px-4 py-2 text-sm text-text-primary [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[rgb(255_216_20)] dark:[color-scheme:dark]" />
              <button onClick={toggleAgentVoice} title={agentListening ? "Detener grabación" : "Grabar mensaje por voz"} aria-label={agentListening ? "Detener grabación de voz" : "Grabar mensaje por voz"} className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${agentListening ? "bg-red-500 text-white animate-pulse" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>{agentListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
              <button onClick={() => sendAgent()} className="h-9 w-9 rounded-full bg-[rgb(255_216_20)] text-black flex items-center justify-center hover:bg-[rgb(247_202_0)]"><Send className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {waOpen && teamPhones.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.95 }} className="w-[280px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border overflow-hidden">
            <div className="bg-[#25D366] text-white px-4 py-2.5 text-sm font-bold">WhatsApp equipo ({teamPhones.length})</div>
            <div className="max-h-64 overflow-auto p-2 space-y-1">
              {teamWa && (
                <a href={teamWa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <span className="font-medium">Equipo general</span>
                </a>
              )}
              {teamPhones.map((t) => (
                <a key={t.phone} href={memberWaLink(t.phone, t.name)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <span className="font-medium">{t.name ?? "Miembro"}</span>
                  <span className="font-mono text-xs text-zinc-500">+{t.phone}</span>
                </a>
              ))}
            </div>
            <p className="px-4 py-2 text-[11px] text-zinc-500 border-t">Se sincroniza con <a href="/manage-team" className="underline">Gestionar el equipo</a></p>
          </motion.div>
        )}
      </AnimatePresence>
      {(teamPhones.length > 0 || teamWa) && (
        teamPhones.length > 0 ? (
          <motion.button onClick={() => setWaOpen((v) => !v)} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 18 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative h-[67px] w-[67px] md:h-16 md:w-16 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center hover:bg-[#128C7E] transition-colors" aria-label="WhatsApp del equipo de tienda">
            <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" aria-hidden />
            <WhatsAppIcon className="h-8 w-8 md:h-8 md:w-8 relative" />
          </motion.button>
        ) : (
          <motion.a href={teamWa as string} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 18 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative h-[67px] w-[67px] md:h-16 md:w-16 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center hover:bg-[#128C7E] transition-colors" aria-label="WhatsApp del equipo de tienda">
            <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" aria-hidden />
            <WhatsAppIcon className="h-8 w-8 md:h-8 md:w-8 relative" />
          </motion.a>
        )
      )}
    </div>
  );
}
