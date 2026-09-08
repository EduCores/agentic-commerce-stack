import { Button } from "@/components/tailgrids/core/button";

export default function ButtonOutlinedPreview() {
  return (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary" appearance="outline">
        Primario
      </Button>
      <Button variant="danger" appearance="outline">
        Peligro
      </Button>
      <Button variant="success" appearance="outline">
        Éxito
      </Button>
      <Button variant="ghost" appearance="outline">
        Fantasma
      </Button>
    </div>
  );
}
