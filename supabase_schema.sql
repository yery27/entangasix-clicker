-- Create a table for public profiles using Supabase's auth.users table
create table profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  coins bigint default 0,
  lifetime_coins bigint default 0,
  click_power int default 1,
  auto_click_power int default 0,
  inventory jsonb default '{}'::jsonb,
  last_seen timestamp with time zone default timezone('utc'::text, now())
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
