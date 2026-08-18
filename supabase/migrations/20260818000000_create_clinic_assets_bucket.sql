-- Public bucket for clinic logos used during onboarding and clinic profile
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-assets',
  'clinic-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view clinic assets" ON storage.objects;
CREATE POLICY "Public can view clinic assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'clinic-assets');
