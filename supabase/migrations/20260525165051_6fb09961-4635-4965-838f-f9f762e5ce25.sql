ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE public.client_recoverables ADD COLUMN IF NOT EXISTS receipt_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = EXCLUDED.public;

DROP POLICY IF EXISTS "Company members can upload receipts" ON storage.objects;
CREATE POLICY "Company members can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND public.is_company_member(
    ((string_to_array(name, '/'))[2])::uuid,
    auth.uid()
  )
);

DROP POLICY IF EXISTS "Company members can view receipts" ON storage.objects;
CREATE POLICY "Company members can view receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND public.is_company_member(
    ((string_to_array(name, '/'))[2])::uuid,
    auth.uid()
  )
);

DROP POLICY IF EXISTS "Company members can delete receipts" ON storage.objects;
CREATE POLICY "Company members can delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND public.is_company_member(
    ((string_to_array(name, '/'))[2])::uuid,
    auth.uid()
  )
);