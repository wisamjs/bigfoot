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
    // On a phone the three cards share one row: the icon and note drop out and the text wraps, never
    // cut off (docs/guidelines/mobile.md).
    <li className="card flex min-w-0 items-center gap-4 p-3 sm:p-6">
      <span className="icon-shape hidden size-12 shrink-0 rounded-card sm:grid">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-xs leading-4 text-body sm:text-sm sm:leading-[1.6]">{label}</p>
        <p className="m-0 break-words text-xl font-bold leading-[1.25] text-heading sm:text-[30px]">{value}</p>
        {note ? <p className="m-0 hidden text-xs leading-4 text-body sm:block">{note}</p> : null}
      </div>
    </li>
  );
}
