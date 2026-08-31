"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { toast } from "sonner";
import { BaseNode } from "./nodes/BaseNode";
import { NODE_PALETTE, type FlowGraph, type FlowNodeData } from "./types";

const nodeTypes = {
  base: BaseNode,
};

const initialGraph: FlowGraph = {
  nodes: [
    { id: "trigger-1", type: "base", position: { x: 250, y: 20 }, data: { label: "Order Created", description: "Trigger: order_created", type: "trigger", status: "idle" } },
    { id: "reserve-1", type: "base", position: { x: 250, y: 150 }, data: { label: "Reserve Stock", description: "Reserva stock", type: "reserve_stock", status: "idle" } },
    { id: "payment-1", type: "base", position: { x: 250, y: 280 }, data: { label: "Process Payment", description: "Stripe / MP", type: "payment", status: "idle" } },
    { id: "fulfill-1", type: "base", position: { x: 250, y: 410 }, data: { label: "Fulfill Order", description: "Envía pedido", type: "fulfill", status: "idle" } },
  ],
  edges: [
    { id: "e1", source: "trigger-1", target: "reserve-1" },
    { id: "e2", source: "reserve-1", target: "payment-1" },
    { id: "e3", source: "payment-1", target: "fulfill-1" },
  ],
};

function toFlowNodes(graph: FlowGraph): Node[] {
  return graph.nodes.map((n) => ({ id: n.id, type: n.type ?? "base", position: n.position, data: n.data as unknown as Record<string, unknown> }));
}
function toFlowEdges(graph: FlowGraph): Edge[] {
  return graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label }));
}

export default function FlowCanvas({
  workflowSlug,
  initialData,
  readOnly = false,
  onSave,
}: {
  workflowSlug?: string;
  initialData?: FlowGraph | null;
  readOnly?: boolean;
  onSave?: (graph: FlowGraph) => Promise<void> | void;
}) {
  const graph = useMemo(() => initialData ?? initialGraph, [initialData]);
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(graph));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(graph));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setNodes(toFlowNodes(initialData));
      setEdges(toFlowEdges(initialData));
    }
  }, [initialData, setNodes, setEdges]);

  const onConnect: OnConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)), [setEdges]);

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as FlowNodeData["type"];
      if (!type || readOnly) return;
      const palette = NODE_PALETTE.find((p) => p.type === type);
      if (!palette) return;
      const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
      const position = { x: event.clientX - bounds.left - 100, y: event.clientY - bounds.top - 40 };
      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type: "base",
        position,
        data: { label: palette.label, description: palette.description, type, status: "idle" },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, readOnly]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleSave = async () => {
    const graphToSave: FlowGraph = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data as unknown as FlowNodeData })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: typeof e.label === "string" ? e.label : undefined })),
    };

    try {
      if (onSave) {
        await onSave(graphToSave);
      } else if (workflowSlug) {
        const res = await fetch(`/api/workflows/${workflowSlug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ graph: graphToSave }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Flujo guardado");
      } else {
        toast.info("Graph listo", { description: `${graphToSave.nodes.length} nodos, ${graphToSave.edges.length} conexiones` });
        console.log("FlowGraph", graphToSave);
      }
    } catch (e) {
      toast.error("Error guardando", { description: String(e) });
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) as Node & { data: FlowNodeData } | undefined;

  return (
    <div className="flex h-[640px] gap-4">
      {!readOnly && (
        <Card className="w-64 shrink-0 overflow-auto p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-tertiary">Palette</p>
          <p className="mb-3 text-xs text-text-tertiary">Arrastra al canvas</p>
          <div className="space-y-2">
            {NODE_PALETTE.map((p) => (
              <div
                key={p.type}
                draggable
                onDragStart={(e) => onDragStart(e, p.type)}
                className="cursor-grab rounded-lg border border-card-border bg-background-gray-secondary p-3 hover:border-brand-500 hover:bg-card-background active:cursor-grabbing"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${p.color}`} />
                  <span className="text-sm font-medium text-text-primary">{p.label}</span>
                </div>
                <p className="mt-1 text-xs text-text-tertiary">{p.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Button className="w-full" onClick={handleSave} appearance="fill">
              Guardar flujo
            </Button>
            <Button
              className="w-full"
              appearance="outline"
              onClick={() => {
                setNodes(toFlowNodes(initialGraph));
                setEdges(toFlowEdges(initialGraph));
                toast.success("Restaurado demo");
              }}
            >
              Reset demo
            </Button>
          </div>
          {selectedNode && (
            <div className="mt-4 rounded-lg border border-card-border p-3">
              <p className="text-xs font-bold text-text-primary">Seleccionado</p>
              <p className="text-sm text-text-secondary">{selectedNode.data.label}</p>
              <p className="text-xs text-text-tertiary">{selectedNode.data.type}</p>
              <Button
                className="mt-2 w-full"
                variant="ghost"
                appearance="outline"
                onClick={() => {
                  setNodes((nds) => nds.filter((n) => n.id !== selectedId));
                  setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
                  setSelectedId(null);
                }}
              >
                Eliminar nodo
              </Button>
            </div>
          )}
        </Card>
      )}
      <Card className="flex-1 overflow-hidden p-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          className="bg-background-gray-secondary"
        >
          <Background />
          <Controls />
          <MiniMap className="!bg-card-background" />
        </ReactFlow>
      </Card>
    </div>
  );
}
