import Tag from "@/components/ui/Tag";
import type { ContractType } from "@/lib/demos";

const TYPE_CONFIG: Record<
  ContractType,
  { label: string; variant: "pink" | "cyan" | "purple" | "phosphor" }
> = {
  "core-modification": { label: "core mod", variant: "pink" },
  "new-service": { label: "new service", variant: "cyan" },
  "new-system-contract": { label: "system", variant: "purple" },
  "mock-contract": { label: "mock", variant: "phosphor" },
};

export default function ContractBadge({ type }: { type: ContractType }) {
  const cfg = TYPE_CONFIG[type];
  return <Tag variant={cfg.variant}>{cfg.label}</Tag>;
}

export function contractTypeLabel(type: ContractType): string {
  return TYPE_CONFIG[type].label;
}
