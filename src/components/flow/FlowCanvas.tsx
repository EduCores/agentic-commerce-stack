"use client";

/**
 * Editor de flujos (grafo XYFlow) con edición inline y conectores estilo n8n.
 *
 * El grafo del WorkflowDefinition "starshop-intent-router" ES la configuración del
 * router del agente: cada nodo crew expone `intent`, `prompt`, `model` y `tools`, y
 * `agent/lib/crew-graph.ts` los lee SOLO si el workflow está publicado (isActive).
 * Si el nodo no cumple la validación (prompt corto, modelo fuera de la allowlist,
 * tools fuera del registry) el agente ignora ese campo y usa el del código.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  Background,
  ConnectionLineType,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { cn } from "@/utils/cn";
import { BaseNode } from "./nodes/BaseNode";
import { NODE_PALETTE, FLOW_INTENTS, FLOW_MIN_PROMPT_LENGTH, FLOW_MODELS, FLOW_TOOLS, INTENT_LABEL_ES, type FlowGraph, type FlowNodeData, type FlowNodeType } from "./types";

const nodeTypes = { base: BaseNode };
type RFInstance = ReactFlowInstance<Node, Edge>;

const DRAG_MIME = "application/acs-node";

/** Estilos compartidos por los controles del inspector. */
const inputCls =
  "w-full rounded-lg border border-card-border bg-card-background px-2.5 py-1.5 text-xs text-text-primary outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">{label}</p>
      {children}
    </div>
  );
}

// ── Geometría del auto-layout (sin dependencias externas) ────────────────────
const NODE_W = 280;
const NODE_H = 130;
const GAP_X = 70;
const GAP_Y = 90;

/** Posiciona los nodos en capas por profundidad (BFS tolerante a ciclos). */
function layeredLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const depth = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  nodes.forEach((n) => incoming.set(n.id, 0));
  edges.forEach((e) => {
    if (incoming.has(e.target)) incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
  });

  const queue = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
  // Si todos tienen padre (grafo con ciclos) arrancamos del primero para no dejar todo suelto
  if (queue.length === 0) queue.push(nodes[0].id);
  queue.forEach((id) => depth.set(id, 0));

  const seen = new Set(queue);
  let head = 0;
  let guard = nodes.length * nodes.length + 1;
  while (head < queue.length && guard-- > 0) {
    const id = queue[head++];
    const d = depth.get(id) ?? 0;
    for (const next of outgoing.get(id) ?? []) {
      if ((depth.get(next) ?? -1) < d + 1) depth.set(next, d + 1);
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  const layers = new Map<number, string[]>();
  const maxDepth = nodes.reduce((acc, n) => Math.max(acc, depth.get(n.id) ?? 0), 0);
  nodes.forEach((n) => {
    // Nodos nunca alcanzados (islas/ciclos cerrados) van a la última capa
    const d = depth.get(n.id) ?? maxDepth + 1;
    layers.set(d, [...(layers.get(d) ?? []), n.id]);
  });

  const positions = new Map<string, { x: number; y: number }>();
  [...layers.keys()]
    .sort((a, b) => a - b)
    .forEach((d) => {
      const ids = layers.get(d) ?? [];
      const width = ids.length * NODE_W + Math.max(0, ids.length - 1) * GAP_X;
      ids.forEach((id, i) => {
        positions.set(id, { x: Math.round(-width / 2 + i * (NODE_W + GAP_X)), y: Math.round(d * (NODE_H + GAP_Y)) });
      });
    });

  return nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }));
}

// ── Conversión FlowGraph (Prisma/JSON) <-> nodos y edges de XYFlow ───────────
function toFlowNodes(graph: FlowGraph): Node[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    type: n.type ?? "base",
    position: n.position ?? { x: 0, y: 0 },
    data: { ...n.data } as unknown as Record<string, unknown>,
  }));
}

function toFlowEdges(graph: FlowGraph): Edge[] {
  return graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? (INTENT_LABEL_ES[e.label] ?? e.label) : "",
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}

function toFlowGraph(nodes: Node[], edges: Edge[]): FlowGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? "base",
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      data: n.data as unknown as FlowNodeData,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" ? e.label : "",
    })),
  };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function initialGraphForType(type: FlowNodeType): FlowGraph {
  const palette = NODE_PALETTE.find((p) => p.type === type) ?? NODE_PALETTE[0];
  return {
    nodes: [
      {
        id: newId(palette.type),
        type: "base",
        position: { x: 0, y: 0 },
        data: { label: palette.label, description: palette.description, type: palette.type, status: "idle", tools: [] },
      },
    ],
    edges: [],
  };
}

export type FlowCanvasProps = {
  workflowSlug?: string;
  initialData?: FlowGraph | null;
  readOnly?: boolean;
  onSave?: (graph: FlowGraph) => Promise<void> | void;
  onPublish?: () => Promise<void> | void;
  isLive?: boolean;
  isLoading?: boolean;
};

export default function FlowCanvas({
  workflowSlug,
  initialData,
  readOnly = false,
  onSave,
  onPublish,
  isLive = false,
  isLoading = false,
}: FlowCanvasProps) {
  const graph = useMemo(() => initialData ?? initialGraphForType("trigger"), [initialData]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(toFlowNodes(graph));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(graph));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [instance, setInstance] = useState<RFInstance | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const dragging = useRef<FlowNodeType | null>(null);

  // Re-sincroniza cuando el server entrega otro grafo (cambio de workflow o reload)
  useEffect(() => {
    setNodes(toFlowNodes(graph));
    setEdges(toFlowEdges(graph));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setDirty(false);
  }, [graph, setNodes, setEdges]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) ?? null, [edges, selectedEdgeId]);
  const nodeData = (selectedNode?.data ?? {}) as unknown as FlowNodeData;

  const updateNodeData = useCallback(
    (patch: Partial<FlowNodeData>) => {
      if (readOnly || !selectedNodeId) return;
      setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
      setDirty(true);
    },
    [readOnly, selectedNodeId, setNodes],
  );

  const updateEdgeLabel = useCallback(
    (label: string) => {
      if (readOnly || !selectedEdgeId) return;
      setEdges((eds) => eds.map((e) => (e.id === selectedEdgeId ? { ...e, label } : e)));
      setDirty(true);
    },
    [readOnly, selectedEdgeId, setEdges],
  );

  // Conectores arrastrables entre handles (estilo n8n) con flecha y trazo suave
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      setEdges((eds) => addEdge({ ...params, id: newId("edge"), type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }, eds));
      setDirty(true);
    },
    [readOnly, setEdges],
  );

  const addNode = useCallback(
    (type: FlowNodeType, position?: { x: number; y: number }) => {
      if (readOnly) return;
      const palette = NODE_PALETTE.find((p) => p.type === type) ?? NODE_PALETTE[0];
      const id = newId(palette.type);
      const fallback = { x: 40 + (nodes.length % 4) * (NODE_W + 30), y: 40 + Math.floor(nodes.length / 4) * (NODE_H + 40) };
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "base",
          position: position ?? fallback,
          data: { label: palette.label, description: palette.description, type: palette.type, status: "idle", tools: [] } as unknown as Record<string, unknown>,
        },
      ]);
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      setDirty(true);
    },
    [nodes.length, readOnly, setNodes],
  );

  const onDragStart = useCallback((event: DragEvent<HTMLButtonElement>, type: FlowNodeType) => {
    dragging.current = type;
    event.dataTransfer.setData(DRAG_MIME, type);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (readOnly) return;
      const type = (dragging.current ?? event.dataTransfer.getData(DRAG_MIME)) as FlowNodeType;
      if (!type || !NODE_PALETTE.some((p) => p.type === type)) return;
      const position = instance?.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, position);
      dragging.current = null;
    },
    [addNode, instance, readOnly],
  );

  const handleAutoLayout = useCallback(() => {
    if (readOnly) return;
    setNodes((nds) => layeredLayout(nds, edges));
    setDirty(true);
    // fitView después del re-render para encuadrar el grafo reordenado
    setTimeout(() => instance?.fitView({ padding: 0.2, duration: 300 }), 60);
  }, [edges, instance, readOnly, setNodes]);

  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    setSaving(true);
    try {
      await onSave(toFlowGraph(nodes, edges));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, onSave, readOnly]);

  const handlePublish = useCallback(async () => {
    if (!onPublish || readOnly) return;
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
    }
  }, [onPublish, readOnly]);

  const toggleTool = useCallback(
    (tool: string) => {
      if (readOnly || !selectedNodeId) return;
      const current = (nodeData.tools ?? []) as string[];
      updateNodeData({ tools: current.includes(tool) ? current.filter((t) => t !== tool) : [...current, tool] });
    },
    [nodeData.tools, readOnly, selectedNodeId, updateNodeData],
  );

  const promptLength = (nodeData.prompt ?? "").trim().length;

  const handleDeleteNode = useCallback(() => {
    if (readOnly || !selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setDirty(true);
  }, [readOnly, selectedNodeId, setEdges, setNodes]);

  return (
    <div className="flex flex-col gap-3 xl:flex-row">
      {/* ── Paleta de nodos (drag & drop o clic) ─────────────────────────── */}
      <Card className="w-full shrink-0 space-y-3 xl:w-60">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Nodos</p>
          <p className="mt-1 text-[11px] leading-4 text-text-tertiary">Arrastra al lienzo o haz clic para agregar.</p>
        </div>
        <div className="space-y-1.5">
          {NODE_PALETTE.map((item) => (
            <button
              key={item.type}
              type="button"
              draggable={!readOnly}
              disabled={readOnly}
              onDragStart={(e) => onDragStart(e, item.type)}
              onClick={() => addNode(item.type)}
              className="flex w-full items-center gap-2 rounded-lg border border-card-border bg-card-background px-2.5 py-2 text-left transition hover:border-brand-500 hover:bg-background-gray-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", item.color)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-text-primary">{item.label}</span>
                <span className="block truncate text-[10px] text-text-tertiary">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="rounded-lg bg-background-gray-secondary p-2.5 text-[10px] leading-4 text-text-tertiary">
          <p className="font-semibold text-text-secondary">Reglas que aplica el agente</p>
          <p>• Prompt: mínimo {FLOW_MIN_PROMPT_LENGTH} caracteres.</p>
          <p>• Modelo: solo de la allowlist.</p>
          <p>• Tools: solo las del registry.</p>
          <p>• Publicado = el agente usa este grafo (~60 s de caché).</p>
        </div>
      </Card>

      {/* ── Lienzo ─────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Card className="flex flex-wrap items-center gap-2 py-3">
          <Badge color={isLoading ? "gray" : isLive ? "success" : "gray"}>
            {isLoading ? "Cargando" : isLive ? "Publicado" : "Borrador"}
          </Badge>
          <span className="text-[11px] text-text-tertiary">
            {isLive ? "El agente lee prompt/modelo/tools de estos nodos." : "El agente usa la configuración del código hasta que publiques."}
          </span>
          {dirty && <Badge color="warning">Cambios sin guardar</Badge>}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" appearance="outline" isDisabled={readOnly} onClick={handleAutoLayout}>
              Auto-orden
            </Button>
            <Button size="sm" variant="ghost" appearance="outline" isDisabled={readOnly || saving || !onSave} onClick={handleSave}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
            <Button size="sm" variant={isLive ? "danger" : "success"} isDisabled={readOnly || publishing || !onPublish} onClick={handlePublish}>
              {publishing ? "Procesando..." : isLive ? "Despublicar" : "Publicar"}
            </Button>
          </div>
        </Card>

        <Card className="min-h-0 flex-1 p-2">
          <div className="h-[62vh] min-h-[440px] w-full overflow-hidden rounded-lg border border-card-border">
            <ReactFlow<Node, Edge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={(changes) => {
                onNodesChange(changes);
                if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) setDirty(true);
              }}
              onEdgesChange={(changes) => {
                onEdgesChange(changes);
                if (changes.some((c) => c.type !== "select")) setDirty(true);
              }}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onInit={(inst) => setInstance(inst)}
              onNodeClick={(_, node) => {
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedNodeId(null);
              }}
              onPaneClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              connectionLineType={ConnectionLineType.SmoothStep}
              defaultEdgeOptions={{ type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }}
              deleteKeyCode={["Backspace", "Delete"]}
              nodesDraggable={!readOnly}
              nodesConnectable={!readOnly}
              elementsSelectable
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
              className="bg-background-gray-secondary"
            >
              <Background />
              <Controls />
              <MiniMap className="!bg-card-background" pannable zoomable />
            </ReactFlow>
          </div>
          {!readOnly && (
            <p className="mt-2 text-[10px] leading-4 text-text-tertiary">
              Conectar: arrastra desde el círculo inferior de un nodo hasta el círculo superior de otro. Borrar: selecciona el nodo o la conexión y pulsa Supr.
            </p>
          )}
        </Card>

        {/* ── Cómo funciona ─────────────────────────────────────────────────── */}
        <Card className="shrink-0 space-y-2 p-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Cómo funciona</p>
            <p className="mt-1 text-[11px] leading-4 text-text-secondary">
              Este grafo es la configuración del router del agente cuando está <strong>publicado</strong>.
            </p>
          </div>
          <ol className="space-y-1.5 text-[11px] leading-4 text-text-tertiary">
            <li>1. Selecciona un nodo crew y edita su <strong>prompt</strong>, <strong>modelo</strong> y <strong>tools</strong>.</li>
            <li>2. El campo <strong>Intent</strong> decide a qué conversación aplica el nodo.</li>
            <li>3. <strong>Guardar cambios</strong> persiste el borrador (no afecta al agente).</li>
            <li>4. <strong>Publicar</strong> activa el grafo: el agente lo usa en ~60 s.</li>
            <li>5. Si algo queda inválido, el agente ignora ese campo y usa el código.</li>
          </ol>
          {dirty && (
            <p className="rounded-lg bg-amber-100 p-2 text-[10px] leading-4 font-semibold text-amber-700">
              Tienes cambios sin guardar: guarda antes de publicar para que el agente los reciba.
            </p>
          )}
          {workflowSlug && <p className="text-[10px] text-text-tertiary">Flujo: {workflowSlug}</p>}
        </Card>
      </div>

      {/* ── Inspector ──────────────────────────────────────────────────────── */}
      <Card className="w-full shrink-0 space-y-3 xl:w-80">
        {selectedNode ? (
          <>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Nodo seleccionado</p>
              <p className="text-[10px] text-text-tertiary">{selectedNode.id}</p>
            </div>

            <Field label="Nombre">
              <input className={inputCls} value={nodeData.label ?? ""} disabled={readOnly} onChange={(e) => updateNodeData({ label: e.target.value })} />
            </Field>

            <Field label="Descripción">
              <input className={inputCls} value={nodeData.description ?? ""} disabled={readOnly} onChange={(e) => updateNodeData({ description: e.target.value })} />
            </Field>

            <Field label="Tipo de nodo">
              <select className={inputCls} value={nodeData.type} disabled={readOnly} onChange={(e) => updateNodeData({ type: e.target.value as FlowNodeType })}>
                {NODE_PALETTE.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Intent (crew que atiende)">
              <select className={inputCls} value={nodeData.intent ?? ""} disabled={readOnly} onChange={(e) => updateNodeData({ intent: e.target.value || undefined })}>
                <option value="">— sin intent (nodo informativo) —</option>
                {FLOW_INTENTS.map((intent) => (
                  <option key={intent} value={intent}>
                    {INTENT_LABEL_ES[intent] ?? intent} ({intent})
                  </option>
                ))}
              </select>
              <p className="text-[10px] leading-4 text-text-tertiary">
                Solo intents válidos configuran al agente.
              </p>
            </Field>

            <Field label="Modelo">
              <select className={inputCls} value={nodeData.model ?? ""} disabled={readOnly} onChange={(e) => updateNodeData({ model: e.target.value || undefined })}>
                <option value="">— usar el del código —</option>
                {FLOW_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
                {nodeData.model && !FLOW_MODELS.some((m) => m.id === nodeData.model) && (
                  <option value={nodeData.model}>{nodeData.model} (no permitido → se ignora)</option>
                )}
              </select>
            </Field>

            <Field label={`Prompt del crew (${promptLength}/${FLOW_MIN_PROMPT_LENGTH})`}>
              <textarea
                rows={7}
                className={cn(inputCls, "h-auto resize-y font-mono text-[11px] leading-4")}
                value={nodeData.prompt ?? ""}
                disabled={readOnly}
                placeholder="Si lo dejas vacío o muy corto, el agente usa el prompt del código."
                onChange={(e) => updateNodeData({ prompt: e.target.value })}
              />
              <p className={cn("text-[10px] leading-4", promptLength === 0 ? "text-text-tertiary" : promptLength >= FLOW_MIN_PROMPT_LENGTH ? "text-emerald-600" : "text-amber-600")}>
                {promptLength === 0
                  ? "Vacío: el agente usa el prompt del código."
                  : promptLength >= FLOW_MIN_PROMPT_LENGTH
                    ? "✔ Se aplicará cuando publiques."
                    : `Faltan ${FLOW_MIN_PROMPT_LENGTH - promptLength} caracteres para que el agente lo use.`}
              </p>
            </Field>

            <Field label="Tools permitidas">
              <div className="flex flex-wrap gap-1">
                {FLOW_TOOLS.map((tool) => {
                  const active = ((nodeData.tools ?? []) as string[]).includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleTool(tool)}
                      className={cn(
                        "rounded-lg border px-2 py-0.5 text-[10px] font-medium transition disabled:cursor-not-allowed",
                        active
                          ? "border-transparent bg-badge-primary-background text-badge-primary-text"
                          : "border-transparent bg-badge-neutral-background text-badge-neutral-text hover:border-brand-500",
                      )}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] leading-4 text-text-tertiary">Sin selección se usan las tools del código para ese intent; nombres inválidos se filtran.</p>
            </Field>

            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="ghost" appearance="outline" className="flex-1" isDisabled={readOnly} onClick={() => instance?.fitView({ nodes: [{ id: selectedNode.id }], padding: 0.8, duration: 300 })}>
                Centrar
              </Button>
              <Button size="sm" variant="danger" appearance="outline" className="flex-1" isDisabled={readOnly} onClick={handleDeleteNode}>
                Eliminar nodo
              </Button>
            </div>
          </>
        ) : selectedEdge ? (
          <>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Conexión</p>
              <p className="text-[10px] text-text-tertiary">{selectedEdge.id}</p>
            </div>
            <div className="rounded-lg bg-background-gray-secondary p-2 text-[11px] text-text-secondary">
              {selectedEdge.source} → {selectedEdge.target}
            </div>
            <Field label="Etiqueta (intent ruteado)">
              <input
                className={inputCls}
                value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                disabled={readOnly}
                placeholder="ej: product_search"
                onChange={(e) => updateEdgeLabel(e.target.value)}
              />
              <p className="text-[10px] leading-4 text-text-tertiary">Informativa para el diagrama; el ruteo real lo define el campo Intent del nodo.</p>
            </Field>
            <Button
              size="sm"
              variant="danger"
              appearance="outline"
              className="w-full"
              isDisabled={readOnly}
              onClick={() => {
                setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
                setSelectedEdgeId(null);
                setDirty(true);
              }}
            >
              Eliminar conexión
            </Button>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Inspector</p>
              <p className="mt-1 text-[11px] leading-4 text-text-secondary">
                Selecciona un nodo crew o una conexión para editar sus valores. El bloque «Cómo funciona» está debajo del diagrama.
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}