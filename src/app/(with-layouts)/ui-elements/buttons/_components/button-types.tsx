import { Button } from "@/components/tailgrids/core/button";

export default function ButtonTypesPreview() {
  return (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primario</Button>
      <Button variant="danger">Peligro</Button>
      <Button variant="success">Éxito</Button>
      <Button variant="ghost">Fantasma</Button>
    </div>
  );
}
