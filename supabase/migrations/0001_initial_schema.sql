-- Brain Drain Pro — initial production schema
-- Supabase / Postgres
--
-- Design principles:
--   * Every user-owned row has a user_id referencing auth.users.
--   * Row Level Security is enabled on every table and denied by default.
--   * The service role (API server) bypasses RLS for validated writes such
--     as analytics ingestion; end users never get direct write access to
--     internal/aggregate tables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  category text,
  pinned_details text,
  personal_details jsonb not null default '{}'::jsonb,
  family jsonb not null default '{}'::jsonb,
  tags jsonb not null default '{}'::jsonb,
  follower_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------
create table if not exists public.topics (
  id text primary key,
  name text unique not null,
  description text not null default '',
  category text,
  follower_count integer not null default 0,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.topic_followers (
  topic_id text not null references public.topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Brains and nodes
-- ---------------------------------------------------------------------------
create table if not exists public.brains (
  id text primary key,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  category text not null default '',
  description text not null default '',
  root_node_id text,
  is_public boolean not null default false,
  is_favorite boolean not null default false,
  repo_status text,
  active_branch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brains_author_idx on public.brains(author_id);
create index if not exists brains_public_idx on public.brains(is_public) where is_public = true;

create table if not exists public.brain_nodes (
  id text primary key,
  brain_id text not null references public.brains(id) on delete cascade,
  node_type text not null check (node_type in ('question', 'outcome')),
  question_text text,
  result_text text,
  next_steps text,
  if_true_node_id text references public.brain_nodes(id) on delete set null,
  if_false_node_id text references public.brain_nodes(id) on delete set null,
  attachments jsonb not null default '[]'::jsonb,
  position jsonb
);

create index if not exists brain_nodes_brain_idx on public.brain_nodes(brain_id);

-- ---------------------------------------------------------------------------
-- Posts, comments, reactions
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references public.topics(id),
  content text not null,
  post_type text not null default 'post',
  event jsonb,
  media_urls text[] not null default '{}',
  brain_id text references public.brains(id) on delete set null,
  comment_count integer not null default 0,
  repost_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists posts_topic_created_idx on public.posts(topic_id, created_at desc);
create index if not exists posts_user_idx on public.posts(user_id);
create index if not exists posts_created_idx on public.posts(created_at desc);

create table if not exists public.comments (
  id text primary key,
  post_id text not null references public.posts(id) on delete cascade,
  parent_id text references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments(post_id, created_at desc);
create index if not exists comments_parent_idx on public.comments(parent_id);

-- Keep posts.comment_count in sync with top-level + reply comments.
create or replace function public.update_post_comment_count()
returns trigger as $$
declare
  affected_post_id text;
begin
  if (tg_op = 'DELETE') then
    affected_post_id := old.post_id;
  else
    affected_post_id := new.post_id;
  end if;

  update public.posts
     set comment_count = (
       select count(*) from public.comments c where c.post_id = affected_post_id
     )
   where id = affected_post_id;

  if (tg_op = 'DELETE') then return old; end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists comments_count_sync on public.comments;
create trigger comments_count_sync
  after insert or delete on public.comments
  for each row execute function public.update_post_comment_count();

-- Reactions support up/down votes, reposts, etc. One row per user per target
-- per reaction type; the unique constraint prevents duplicate votes.
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('upvote', 'downvote', 'repost')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id, reaction_type)
);

create index if not exists reactions_target_idx on public.reactions(target_type, target_id);
create index if not exists reactions_user_idx on public.reactions(user_id);

create index if not exists reactions_target_idx on public.reactions(target_type, target_id);

-- ---------------------------------------------------------------------------
-- Missions & milestones
-- ---------------------------------------------------------------------------
create table if not exists public.missions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Other',
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  target_date timestamptz,
  progress integer not null default 0 check (progress between 0 and 100),
  xp_reward integer not null default 0,
  course_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missions_user_status_idx on public.missions(user_id, status);

create table if not exists public.milestones (
  id text primary key,
  mission_id text not null references public.missions(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  "order" integer not null default 0
);

create index if not exists milestones_mission_idx on public.milestones(mission_id, "order");

-- ---------------------------------------------------------------------------
-- Reputation / XP
-- ---------------------------------------------------------------------------
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  xp_gained integer not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_idx on public.xp_events(user_id, created_at desc);

create table if not exists public.reputation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  last_active_date date,
  total_missions_completed integer not null default 0,
  total_brains_created integer not null default 0,
  total_check_ins integer not null default 0,
  badges text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Communities / circles / check-ins
-- ---------------------------------------------------------------------------
create table if not exists public.communities (
  id text primary key,
  name text not null,
  description text not null default '',
  image text,
  icon text,
  member_count integer not null default 0,
  weekly_goal text,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id text not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.check_ins (
  id text primary key,
  circle_id text not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null default '',
  mood_score integer check (mood_score between 1 and 5),
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  replies jsonb not null default '[]'::jsonb,
  linked_brain_id text,
  created_at timestamptz not null default now()
);

create index if not exists check_ins_circle_idx on public.check_ins(circle_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Conversations / messages
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id text primary key,
  last_message text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  is_brain boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  actor_name text not null default '',
  content text not null default '',
  post_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, read, created_at desc);

-- ---------------------------------------------------------------------------
-- Pathways
-- ---------------------------------------------------------------------------
create table if not exists public.pathways (
  id text primary key,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  category text not null default '',
  brain_ids text[] not null default '{}',
  forked_from_id text references public.pathways(id) on delete set null,
  fork_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Analytics (service-role writes only)
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  type text not null,
  route text not null default '',
  payload jsonb not null default '{}'::jsonb,
  client_created_at timestamptz not null,
  server_created_at timestamptz not null default now()
);

create index if not exists analytics_events_type_idx on public.analytics_events(type);
create index if not exists analytics_events_user_idx on public.analytics_events(user_id);
create index if not exists analytics_events_session_idx on public.analytics_events(session_id);
create index if not exists analytics_events_client_created_idx on public.analytics_events(client_created_at desc);
create index if not exists analytics_events_route_idx on public.analytics_events(route);

-- Aggregate recommendation tables (maintained by the API server / jobs)
create table if not exists public.user_topic_affinity (
  user_id uuid not null,
  topic_id text not null,
  score numeric not null default 0,
  last_signal_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table if not exists public.post_scores (
  post_id text primary key references public.posts(id) on delete cascade,
  engagement_score numeric not null default 0,
  freshness_score numeric not null default 0,
  relevance_score numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.brain_scores (
  brain_id text primary key references public.brains(id) on delete cascade,
  launch_count integer not null default 0,
  save_count integer not null default 0,
  share_count integer not null default 0,
  recommendation_score numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.mission_scores (
  mission_id text primary key references public.missions(id) on delete cascade,
  urgency_score numeric not null default 0,
  progress_risk_score numeric not null default 0,
  reminder_score numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','brains','missions','reputation','pathways',
    'user_topic_affinity','post_scores','brain_scores','mission_scores'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; ' ||
      'create trigger set_updated_at before update on public.%I ' ||
      'for each row execute function public.touch_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Default deny; explicit policies below.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','topics','topic_followers','brains','brain_nodes',
    'posts','comments','reactions','missions','milestones',
    'xp_events','reputation','communities','community_members','check_ins',
    'conversations','conversation_participants','messages','notifications',
    'pathways','analytics_events','user_topic_affinity','post_scores',
    'brain_scores','mission_scores'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Profiles: publicly readable, only the owner can write.
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Topics: readable by everyone; only the service role writes (seeded data).
create policy "topics are readable by everyone"
  on public.topics for select using (true);

create policy "topic followers: read follows"
  on public.topic_followers for select using (true);
create policy "users can follow/unfollow topics"
  on public.topic_followers for insert
  with check (auth.uid() = user_id);
create policy "users can unfollow topics"
  on public.topic_followers for delete
  using (auth.uid() = user_id);

-- Brains: public brains and own brains are readable; only the author writes.
create policy "brains readable if public or own"
  on public.brains for select
  using (is_public = true or author_id = auth.uid());
create policy "authors can insert their own brains"
  on public.brains for insert
  with check (author_id = auth.uid());
create policy "authors can update their own brains"
  on public.brains for update
  using (author_id = auth.uid());
create policy "authors can delete their own brains"
  on public.brains for delete
  using (author_id = auth.uid());

create policy "brain nodes readable for readable brains"
  on public.brain_nodes for select
  using (
    exists (
      select 1 from public.brains b
      where b.id = brain_nodes.brain_id
        and (b.is_public = true or b.author_id = auth.uid())
    )
  );
create policy "authors can write their own brain nodes"
  on public.brain_nodes for all
  using (
    exists (
      select 1 from public.brains b
      where b.id = brain_nodes.brain_id and b.author_id = auth.uid()
    )
  );

-- Posts: readable by everyone (feed is public); authors write their own.
create policy "posts are readable by everyone"
  on public.posts for select using (true);
create policy "users can create their own posts"
  on public.posts for insert with check (auth.uid() = user_id);
create policy "authors can update their own posts"
  on public.posts for update using (auth.uid() = user_id);
create policy "authors can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

create policy "comments are readable by everyone"
  on public.comments for select using (true);
create policy "users can create their own comments"
  on public.comments for insert with check (auth.uid() = user_id);
create policy "authors can delete their own comments"
  on public.comments for delete using (auth.uid() = user_id);

create policy "reactions are readable by everyone"
  on public.reactions for select using (true);
create policy "users can manage their own reactions"
  on public.reactions for all using (auth.uid() = user_id);

-- Missions/milestones: private to the owner.
create policy "users can read their own missions"
  on public.missions for select using (auth.uid() = user_id);
create policy "users can create their own missions"
  on public.missions for insert with check (auth.uid() = user_id);
create policy "users can update their own missions"
  on public.missions for update using (auth.uid() = user_id);
create policy "users can delete their own missions"
  on public.missions for delete using (auth.uid() = user_id);

create policy "users can read their own milestones"
  on public.milestones for select
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.user_id = auth.uid()
    )
  );
create policy "users can write their own milestones"
  on public.milestones for all
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_id and m.user_id = auth.uid()
    )
  );

-- Reputation/XP: a user's own data is private to them.
create policy "users can read their own reputation"
  on public.reputation for select using (auth.uid() = user_id);
create policy "users can read their own xp events"
  on public.xp_events for select using (auth.uid() = user_id);

-- Communities and members are public; membership writes are self-service.
create policy "communities are readable by everyone"
  on public.communities for select using (true);
create policy "community members are readable by everyone"
  on public.community_members for select using (true);
create policy "users can join communities"
  on public.community_members for insert
  with check (auth.uid() = user_id);
create policy "users can leave communities"
  on public.community_members for delete
  using (auth.uid() = user_id);

create policy "check-ins are readable by everyone"
  on public.check_ins for select using (true);
create policy "users can create their own check-ins"
  on public.check_ins for insert with check (auth.uid() = user_id);
create policy "users can delete their own check-ins"
  on public.check_ins for delete using (auth.uid() = user_id);

-- Conversations/messages: only participants can read and send.
create policy "participants can read conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = conversations.id and p.user_id = auth.uid()
    )
  );
create policy "participants can read membership"
  on public.conversation_participants for select
  using (auth.uid() = user_id or
    exists (
      select 1 from public.conversation_participants p2
      where p2.conversation_id = conversation_participants.conversation_id
        and p2.user_id = auth.uid()
    )
  );
create policy "users can insert themselves into a conversation"
  on public.conversation_participants for insert
  with check (auth.uid() = user_id);
create policy "participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
  );
create policy "users can send messages as themselves"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- Notifications: only the recipient can read/manage.
create policy "users can read their own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "users can mark their notifications read"
  on public.notifications for update using (auth.uid() = user_id);

-- Pathways: public read; author writes.
create policy "pathways are readable by everyone"
  on public.pathways for select using (true);
create policy "authors can create pathways"
  on public.pathways for insert with check (auth.uid() = author_id);
create policy "authors can update pathways"
  on public.pathways for update using (auth.uid() = author_id);
create policy "authors can delete pathways"
  on public.pathways for delete using (auth.uid() = author_id);

-- Analytics and aggregate tables: no direct client access.
-- The API server uses the service role key, which bypasses RLS.
-- (No policies = default deny for authenticated end users.)

-- ---------------------------------------------------------------------------
-- Helpful views for the feed
-- ---------------------------------------------------------------------------
create or replace view public.posts_with_counts as
  select
    p.*,
    t.name as topic_name,
    pr.display_name as author_name,
    pr.avatar_url as author_avatar_url
  from public.posts p
  left join public.topics t on t.id = p.topic_id
  left join public.profiles pr on pr.id = p.user_id;
