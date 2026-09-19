-- Supabase Storage Configuration for DocuMind
-- Run this script in your Supabase SQL Editor to create the storage bucket for uploaded documents.

-- 1. Create the private 'documents' storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'documents', 
    'documents', 
    false, -- Private bucket (authenticated requests required)
    10485760, -- 10 MB limit
    array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ]
)
on conflict (id) do update set
    file_size_limit = 10485760,
    allowed_mime_types = array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

-- 2. Storage RLS Policies
-- Allow authenticated users to view files in their organization folder
create policy "Allow read access to organization files"
    on storage.objects for select
    using (
        bucket_id = 'documents' 
        and auth.role() = 'authenticated'
    );

-- Allow authenticated users to upload files to their organization folder
create policy "Allow upload access to organization files"
    on storage.objects for insert
    with check (
        bucket_id = 'documents' 
        and auth.role() = 'authenticated'
    );

-- Allow deletion of organization files
create policy "Allow delete access to organization files"
    on storage.objects for delete
    using (
        bucket_id = 'documents' 
        and auth.role() = 'authenticated'
    );
