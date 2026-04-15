-- Policy for user-files bucket
CREATE POLICY "Users access own files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for org-files bucket
CREATE POLICY "Org members access org files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'org-files' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM public.organization_users 
    WHERE user_id = auth.uid()
  )
);
