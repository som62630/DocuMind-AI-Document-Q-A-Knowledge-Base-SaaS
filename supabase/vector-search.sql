-- Supabase Vector Similarity Search Stored Function
-- Run this script in your Supabase SQL Editor to enable pgvector match RPC.

create or replace function public.match_document_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_organization_id text,
  filter_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  document_name text,
  content text,
  page_number int,
  chunk_index int,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    c.id,
    c.document_id,
    d.name as document_name,
    c.content,
    c.page_number,
    c.chunk_index,
    c.metadata,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.organization_id = filter_organization_id
    and (
      filter_document_ids is null 
      or array_length(filter_document_ids, 1) is null 
      or c.document_id = any(filter_document_ids)
    )
    and (1 - (c.embedding <=> query_embedding)) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;
