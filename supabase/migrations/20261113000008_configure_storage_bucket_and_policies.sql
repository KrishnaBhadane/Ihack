-- ==============================================================================
-- NIRNAY Migration 008: Storage Bucket & Storage Object RLS Policies
-- Strictly Private Storage for Sensitive Identity & Property Collateral Files
-- Path Traversal & Folder Manipulation Hardened
-- ==============================================================================

-- 1. Create Private Bucket 'mortgage-documents' in storage schema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mortgage-documents',
    'mortgage-documents',
    false, -- Strictly Private Bucket
    15728640, -- 15MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- 2. Storage RLS Policies on storage.objects

-- Allow authenticated borrowers to upload documents ONLY into their own application folder
-- Path MUST begin with a valid UUID prefix matching an owned application, with zero directory traversal
DROP POLICY IF EXISTS "Borrowers upload to own draft folder" ON storage.objects;
CREATE POLICY "Borrowers upload to own draft folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'mortgage-documents' AND
    name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
    name NOT LIKE '%..%' AND
    name NOT LIKE '%//%' AND
    name NOT LIKE '%\%' AND
    EXISTS (
        SELECT 1 FROM public.loan_applications
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
          AND (status = 'draft' OR status = 'in_verification')
    )
);

-- Allow authenticated borrowers to read documents from their own application folder
DROP POLICY IF EXISTS "Borrowers read own documents" ON storage.objects;
CREATE POLICY "Borrowers read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'mortgage-documents' AND
    name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
    name NOT LIKE '%..%' AND
    EXISTS (
        SELECT 1 FROM public.loan_applications
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
    )
);

-- Allow bank staff (underwriter, reviewer, super_admin) to inspect all mortgage documents
DROP POLICY IF EXISTS "Bank staff inspect all mortgage documents" ON storage.objects;
CREATE POLICY "Bank staff inspect all mortgage documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'mortgage-documents' AND
    public.is_bank_staff() = true
);

-- Allow borrowers to delete/replace document only while application is still in draft
DROP POLICY IF EXISTS "Borrowers delete draft documents" ON storage.objects;
CREATE POLICY "Borrowers delete draft documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'mortgage-documents' AND
    name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
    name NOT LIKE '%..%' AND
    EXISTS (
        SELECT 1 FROM public.loan_applications
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
          AND status = 'draft'
          AND is_locked = false
    )
);
