"use client";

import { useCallback, useEffect, useState } from "react";
import { TabRoot, TabList, TabTrigger, TabContent } from "@/components/tailgrids/core/tabs";
import { Badge } from "@/components/tailgrids/core/badge";
import { TemplateSection } from "./template-section";
import { SequenceSection } from "./sequence-section";
import { CartSection } from "./cart-section";
import { LogSection } from "./log-section";
import { TestPanel } from "./test-panel";
import type { CartDTO, EmailSequenceDTO, EmailTemplateDTO, LogDTO } from "./types";

export function EmailsStudio() {
  const [templates, setTemplates] = useState<EmailTemplateDTO[]>([]);
  const [mocked, setMocked] = useState(true);
  const [sequences, setSequences] = useState<EmailSequenceDTO[]>([]);
  const [carts, setCarts] = useState<CartDTO[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<LogDTO[]>([]);

  const loadTemplates = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/emails");
      const j = await r.json();
      if (r.ok) {
        setTemplates(j.templates ?? []);
        setMocked(j.mocked ?? true);
      }
    } catch {
      // Se reintenta al guardar o recargar la página.
    }
  }, []);

  const loadSequences = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/emails/sequences");
      const j = await r.json();
      if (r.ok) setSequences(j.sequences ?? []);
    } catch {
      // Idem.
    }
  }, []);

  const loadCarts = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/emails/carts");
      if (!r.ok) {
        setCarts([]);
        return;
      }
      const j = await r.json();
      setCarts(j.carts ?? []);
      setCounts(j.counts ?? {});
    } catch {
      setCarts([]);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/emails/logs?limit=50");
      if (!r.ok) {
        setLogs([]);
        return;
      }
      const j = await r.json();
      setLogs(j.logs ?? []);
    } catch {
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initial() {
      try {
        const [tr, sr, cr, lr] = await Promise.all([
          fetch("/api/admin/emails"),
          fetch("/api/admin/emails/sequences"),
          fetch("/api/admin/emails/carts"),
          fetch("/api/admin/emails/logs?limit=50"),
        ]);
        if (ignore) return;
        if (tr.ok) {
          const tj = await tr.json();
          if (ignore) return;
          setTemplates(tj.templates ?? []);
          setMocked(tj.mocked ?? true);
        }
        if (sr.ok) {
          const sj = await sr.json();
          if (ignore) return;
          setSequences(sj.sequences ?? []);
        }
        if (cr.ok) {
          const cj = await cr.json();
          if (ignore) return;
          setCarts(cj.carts ?? []);
          setCounts(cj.counts ?? {});
        }
        if (lr.ok) {
          const lj = await lr.json();
          if (ignore) return;
          setLogs(lj.logs ?? []);
        }
      } catch {
        // Se reintenta con los botones de actualizar.
      }
    }
    void initial();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={mocked ? "gray" : "success"}>{mocked ? "modo prueba (sin RESEND_API_KEY)" : "envío real por Resend"}</Badge>
        <Badge color="primary">automático cada hora + botón Procesar ahora</Badge>
      </div>
      <TabRoot defaultValue="plantillas">
        <TabList>
          <TabTrigger value="plantillas">Plantillas</TabTrigger>
          <TabTrigger value="secuencias">Secuencias</TabTrigger>
          <TabTrigger value="carros">Carros abandonados</TabTrigger>
          <TabTrigger value="historial">Historial</TabTrigger>
          <TabTrigger value="probar">Probar envío</TabTrigger>
        </TabList>
        <TabContent value="plantillas">
          <TemplateSection templates={templates} onReload={loadTemplates} />
        </TabContent>
        <TabContent value="secuencias">
          <SequenceSection sequences={sequences} templates={templates} onReload={loadSequences} />
        </TabContent>
        <TabContent value="carros">
          <CartSection carts={carts} counts={counts} onReload={() => { loadCarts(); loadLogs(); }} />
        </TabContent>
        <TabContent value="historial">
          <LogSection logs={logs} onReload={loadLogs} />
        </TabContent>
        <TabContent value="probar">
          <TestPanel templates={templates} />
        </TabContent>
      </TabRoot>
    </div>
  );
}
