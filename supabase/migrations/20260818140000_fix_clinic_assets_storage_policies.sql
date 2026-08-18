-- Clinic logo uploads insert into storage.objects. Do not ALTER storage.objects;
-- that table is owned by supabase_storage_admin.

SET ROLE supabase_storage_admin;

DROP POLICY IF EXISTS "Public can view clinic assets" ON storage.objects;
CREATE POLICY "Public can view clinic assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'clinic-assets');

DROP POLICY IF EXISTS "Authenticated can upload clinic assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow clinic asset uploads" ON storage.objects;
CREATE POLICY "Allow clinic asset uploads"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-assets'
  AND (storage.foldername(name))[1] = 'clinic-logos'
);

DROP POLICY IF EXISTS "Authenticated can update clinic assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow clinic asset updates" ON storage.objects;
CREATE POLICY "Allow clinic asset updates"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'clinic-assets'
  AND (storage.foldername(name))[1] = 'clinic-logos'
)
WITH CHECK (
  bucket_id = 'clinic-assets'
  AND (storage.foldername(name))[1] = 'clinic-logos'
);

DROP POLICY IF EXISTS "Authenticated can delete clinic assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow clinic asset deletes" ON storage.objects;
CREATE POLICY "Allow clinic asset deletes"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'clinic-assets'
  AND (storage.foldername(name))[1] = 'clinic-logos'
);
