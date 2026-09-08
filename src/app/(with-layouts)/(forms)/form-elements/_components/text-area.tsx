import { FieldError, FieldLabel } from "@/components/tailgrids/core/field";
import { TextArea } from "@/components/tailgrids/core/text-area";
import { TextField } from "@/components/tailgrids/core/text-field";

export default function TextAreaInput() {
  return (
    <div className="flex flex-col gap-5 p-6">
      <TextField className="w-full gap-2">
        <FieldLabel>Mensaje</FieldLabel>
        <TextArea placeholder="Escribe tu mensaje aquí..." />
        <FieldError>La biografía debe tener entre 5 y 280 caracteres.</FieldError>
      </TextField>

      <TextField className="w-full gap-2" invalid>
        <FieldLabel>Mensaje</FieldLabel>
        <TextArea placeholder="Escribe tu mensaje aquí..." />
        <FieldError>El mensaje debe tener entre 5 y 280 caracteres.</FieldError>
      </TextField>

      <TextField className="w-full gap-2" disabled>
        <FieldLabel>Mensaje</FieldLabel>
        <TextArea placeholder="Escribe tu mensaje aquí..." />
      </TextField>
    </div>
  );
}
