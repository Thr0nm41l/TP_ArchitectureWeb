-- Allow users to view (select) their own documents
create policy "Users can view their own documents"
  on docs for select
  using (auth.uid() = user_id);

-- Allow users to insert (create) documents for themselves
create policy "Users can insert their own documents"
  on docs for insert
  with check (auth.uid() = user_id);

-- Allow users to insert (upload) files into their own folder 1qlxqgy_0
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'docBucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view (download) their own files from their folder 1qlxqgy_0
CREATE POLICY "Users can download their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'docBucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);