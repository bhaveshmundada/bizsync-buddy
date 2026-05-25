import { useRef } from "react";
import { Upload, X, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_SIZE = 5 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ReceiptUploader({
  file,
  onFile,
  existingUrl,
  onClearExisting,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  existingUrl?: string | null;
  onClearExisting?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = (f: File | null) => {
    if (!f) return onFile(null);
    if (f.size > MAX_SIZE) {
      onFile(null);
      alert("File too large — max 5 MB");
      return;
    }
    onFile(f);
  };

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="truncate font-medium text-gray-900">{file.name}</span>
          <span className="shrink-0 text-xs text-gray-500">{formatFileSize(file.size)}</span>
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0 text-gray-400 hover:text-rose-600" onClick={() => onFile(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (existingUrl) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-emerald-50 p-3">
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <FileText className="h-4 w-4" />
          <span>Receipt already attached</span>
        </div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => inputRef.current?.click()}>Replace</Button>
          {onClearExisting && (
            <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600" onClick={onClearExisting}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => handlePick(e.target.files?.[0] ?? null)} />
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handlePick(e.dataTransfer.files?.[0] ?? null);
      }}
      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:border-emerald-400 hover:bg-emerald-50/40"
    >
      <Upload className="mb-2 h-5 w-5 text-gray-400" />
      <p className="text-sm font-medium text-gray-700">Click to upload or drag &amp; drop</p>
      <p className="mt-0.5 text-xs text-gray-500">JPG, PNG, WEBP or PDF · max 5 MB</p>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => handlePick(e.target.files?.[0] ?? null)} />
    </div>
  );
}

export async function uploadReceipt(opts: {
  file: File;
  companyId: string;
  rowId: string;
}): Promise<string> {
  const safeName = opts.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `receipts/${opts.companyId}/${opts.rowId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from("expense-receipts").upload(path, opts.file, {
    contentType: opts.file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function ReceiptLink({ path }: { path: string | null | undefined }) {
  if (!path) return <span className="text-gray-300">—</span>;
  const open = async () => {
    const { data, error } = await supabase.storage.from("expense-receipts").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      alert("Couldn't open receipt — it may have been deleted.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <button
      type="button"
      onClick={open}
      title="View receipt"
      className="inline-flex h-7 w-7 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50"
    >
      <Paperclip className="h-4 w-4" />
    </button>
  );
}
