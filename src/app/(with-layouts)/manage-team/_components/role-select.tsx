"use client";

import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";

const ROLES = ["member", "admin", "owner"] as const;

type Props = {
  value: string;
  onChange: (next: string) => void;
  label: string;
  size?: "sm" | "md";
};

export function RoleSelect({ value, onChange, label, size = "md" }: Props) {
  return (
    <Select value={value} onChange={(v) => onChange(String(v))} aria-label={label}>
      <SelectTrigger size={size}>
        <SelectValue />
        <SelectIndicator />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} id={r} textValue={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
