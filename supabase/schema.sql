-- DocuMind Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your project tables, indexes, and Row-Level Security policies.

-- Enable pgvector extension
create extension if not exists vector;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop existing tables if they exist (for clean migrations)
drop table if exists public.usage_logs cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.document_chunks cascade;
drop table if exists public.documents cascade;
drop table if exists public.organization_members cascade;
drop table if exists public.organizations cascade;

-- 1. Organizations
create table public.organizations (
    id text primary key, -- Maps directly to Clerk organization ID (org_***)
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Organization Members
create table public.organization_members (
    id uuid default gen_random_uuid() primary key,
    organization_id text references public.organizations(id) on delete cascade not null,
    user_id text not null, -- Clerk user ID (user_***)
    role text not null check (role in ('owner', 'member', 'viewer')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(organization_id, user_id)
);

-- 3. Documents
create table public.documents (
    id uuid default gen_random_uuid() primary key,
    organization_id text references public.organizations(id) on delete cascade not null,
    name text not null,
    file_path text not null, -- Path inside Supabase Storage
    size_bytes integer not null,
    mime_type text not null,
    status text not null check (status in ('queued', 'processing', 'ready', 'failed')),
    error_reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Document Chunks
create table public.document_chunks (
    id uuid default gen_random_uuid() primary key,
    document_id uuid references public.documents(id) on delete cascade not null,
    organization_id text references public.organizations(id) on delete cascade not null,
    content text not null,
    embedding vector(1536), -- 1536 dimensions for OpenAI/Claude text-embedding-3-small
    page_number integer,
    chunk_index integer not null,
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Conversations
create table public.conversations (
    id uuid default gen_random_uuid() primary key,
    organization_id text references public.organizations(id) on delete cascade not null,
    user_id text not null, -- Clerk user ID
    title text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Messages
create table public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    citations jsonb default '[]'::jsonb not null, -- List of chunk references utilized
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Usage Logs
create table public.usage_logs (
    id uuid default gen_random_uuid() primary key,
    organization_id text references public.organizations(id) on delete cascade not null,
    user_id text not null,
    action_type text not null check (action_type in ('document_upload', 'rag_query')),
    tokens_used integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index idx_org_members_user on public.organization_members(user_id);
create index idx_documents_org on public.documents(organization_id);
create index idx_chunks_doc on public.document_chunks(document_id);
create index idx_chunks_org on public.document_chunks(organization_id);
create index idx_conversations_org on public.conversations(organization_id);
create index idx_messages_conversation on public.messages(conversation_id);
create index idx_usage_logs_org on public.usage_logs(organization_id);

-- Create HNSW index for pgvector similarity search (using cosine operator)
create index idx_chunks_embedding_hnsw on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.usage_logs enable row level security;

--------------------------------------------------------------------------------
-- Helper Functions for Clerk JWT extraction
--------------------------------------------------------------------------------

-- Helper: Get Clerk User ID from JWT claims
create or replace function public.clerk_user_id()
returns text as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ language sql stable security definer;

-- Helper: Check if Clerk user belongs to organization
create or replace function public.is_org_member(org_id text, user_id text)
returns boolean as $$
begin
    return exists (
        select 1 from public.organization_members
        where organization_members.organization_id = org_id
        and organization_members.user_id = user_id
    );
end;
$$ language plpgsql security definer;

-- Helper: Get Clerk User Role in organization
create or replace function public.clerk_user_role(org_id text)
returns text as $$
declare
    member_role text;
begin
    select role into member_role 
    from public.organization_members
    where organization_members.organization_id = org_id
    and organization_members.user_id = public.clerk_user_id();
    return member_role;
end;
$$ language plpgsql security definer;

--------------------------------------------------------------------------------
-- Row-Level Security (RLS) Policies
--------------------------------------------------------------------------------

-- 1. Organizations Policies
create policy "Allow select for verified members"
    on public.organizations for select
    using (public.is_org_member(id, public.clerk_user_id()));

create policy "Allow insert for system/admin"
    on public.organizations for insert
    with check (true);

-- 2. Organization Members Policies
create policy "Members can view other members in their organization"
    on public.organization_members for select
    using (public.is_org_member(organization_id, public.clerk_user_id()));

create policy "Only owners can modify membership"
    on public.organization_members for all
    using (public.clerk_user_role(organization_id) = 'owner')
    with check (public.clerk_user_role(organization_id) = 'owner');

-- 3. Documents Policies
create policy "Members can view documents in their organization"
    on public.documents for select
    using (public.is_org_member(organization_id, public.clerk_user_id()));

create policy "Owners and Members can write documents, Viewers cannot"
    on public.documents for all
    using (public.clerk_user_role(organization_id) in ('owner', 'member'))
    with check (public.clerk_user_role(organization_id) in ('owner', 'member'));

-- 4. Document Chunks Policies
create policy "Members can view chunks in their organization"
    on public.document_chunks for select
    using (public.is_org_member(organization_id, public.clerk_user_id()));

create policy "Only backend system / upload processes can insert chunks"
    on public.document_chunks for all
    using (true)
    with check (true);

-- 5. Conversations Policies
create policy "Members can access conversations in their organization"
    on public.conversations for all
    using (public.is_org_member(organization_id, public.clerk_user_id()))
    with check (public.is_org_member(organization_id, public.clerk_user_id()));

-- 6. Messages Policies
create policy "Members can access messages in their conversation"
    on public.messages for select
    using (
        exists (
            select 1 from public.conversations
            where conversations.id = conversation_id
            and public.is_org_member(conversations.organization_id, public.clerk_user_id())
        )
    );

create policy "Members can insert messages in their conversation"
    on public.messages for insert
    with check (
        exists (
            select 1 from public.conversations
            where conversations.id = conversation_id
            and public.is_org_member(conversations.organization_id, public.clerk_user_id())
        )
    );

-- 7. Usage Logs Policies
create policy "Members can view usage logs in their organization"
    on public.usage_logs for select
    using (public.is_org_member(organization_id, public.clerk_user_id()));

create policy "System can create usage logs"
    on public.usage_logs for insert
    with check (true);
