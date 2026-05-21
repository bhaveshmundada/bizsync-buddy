import { initials } from "@/lib/format";

const COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

function hash(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function MemberAvatar({
  name,
  size = "sm",
  showName = true,
}: {
  name: string;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
}) {
  const color = COLORS[hash(name) % COLORS.length];
  const sizeClass = size === "xs" ? "h-5 w-5 text-[10px]" : size === "md" ? "h-8 w-8 text-sm" : "h-6 w-6 text-xs";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center justify-center rounded-full font-medium ${color} ${sizeClass}`}
      >
        {initials(name) || "?"}
      </span>
      {showName && <span className="text-sm text-gray-700">{name}</span>}
    </span>
  );
}
