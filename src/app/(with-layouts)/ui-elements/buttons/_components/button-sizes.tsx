import { Button } from "@/components/tailgrids/core/button";

export default function ButtonSizesPreview() {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <Button size="xs">Extra pequeño</Button>
      <Button size="sm">Pequeño</Button>
      <Button size="md">Mediano</Button>
      <Button size="lg">Grande</Button>
    </div>
  );
}
