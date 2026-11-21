import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <li className="card flex items-center gap-4 p-6">
      <span className="icon-shape size-12 shrink-0 rounded-card">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-sm leading-[1.6] text-body">{label}</p>
        <p className="m-0 truncate text-[30px] font-bold leading-[1.25] text-heading">{value}</p>
        {note ? <p className="m-0 text-xs leading-4 text-body">{note}</p> : null}
      </div>
    </li>
  );
}
