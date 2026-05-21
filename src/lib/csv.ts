export function exportCSV<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const v = r[c.key];
          const s = v == null ? "" : String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
