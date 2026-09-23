/**
 * displayModelName — nombre corto para PANTALLA.
 * Los IDs reales de OpenRouter (ej. qwen/qwen3-30b-a3b-instruct-2507) se usan
 * tal cual en llamadas API y BD; aquí solo se abrevian para mostrar.
 */
export function displayModelName(id: string | null | undefined): string {
  if (!id) return "—";
  const short = id.split("/").pop() ?? id;
  if (/^qwen3-30b/i.test(short)) return "Qwen3-30B";
  return short;
}
