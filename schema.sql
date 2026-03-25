-- Supabase Schema for wrAIte Path

-- Create Projects Table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  template text not null,
  mode text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Scenes Table
create table public.scenes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  scene_number integer not null,
  location text not null,
  time_of_day text not null,
  synopsis text,
  content text
);

-- Create Characters Table
create table public.characters (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  dialogue_count integer default 0,
  appearance_count integer default 0,
  role_tag text,
  lore text,
  portrait_url text,
  unique(project_id, name)
);

-- Create Ideas Table
create table public.ideas (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  content text not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for better performance
create index idx_scenes_project_id on public.scenes(project_id);
create index idx_characters_project_id on public.characters(project_id);
create index idx_ideas_project_id on public.ideas(project_id);
