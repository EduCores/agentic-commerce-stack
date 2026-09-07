"use client";

import { useState } from "react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";

export function SyncButton({ storeId, storeName }: { storeId: string; storeName: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ synced: number; total: number; ms: number } | null>(null);

  async function onSync() {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/store/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setResult(j.result);
      toast.success(j.message);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button appearance="fill" onClick={onSync} isDisabled={loading} className="w-full">
        {loading ? "Sincronizando..." : `Sincronizar ${storeName}`}
      </Button>
      {loading && <div className="h-2 w-full overflow-hidden rounded-full bg-background-gray-secondary"><div className="h-full w-1/2 animate-pulse bg-brand-500" /></div>}
      {result && (
        <p className="text-xs text-text-tertiary text-center">
          ✅ {result.synced}/{result.total} productos en {result.ms}ms
        </p>
      )}
    </div>
  );
}
