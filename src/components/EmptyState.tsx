import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-gray-300" />
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      {description && <p className="max-w-sm text-xs text-gray-500">{description}</p>}
    </div>
  );
}
