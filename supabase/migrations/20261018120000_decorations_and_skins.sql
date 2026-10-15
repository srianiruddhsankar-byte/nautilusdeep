-- Phase 7 part 2: owned decorations (with where they're placed) and each tank's skin.
-- Coins are NOT stored: earned coins are derived from sessions; spending is the
-- price on each owned decoration. Balance = earned − sum(price).
--
-- Tank numbers (0 = Tank 1) refer to the DERIVED tanks (10 fish each, see lib/fish.ts).
-- Changing the fish rules could shift which tank a number points at.

-- ---------- Decorations ----------

create table public.decorations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item text not null check (char_length(item) between 1 and 40), -- a catalogue id, e.g. 'shell'
  price integer not null check (price >= 0), -- coins paid; 0 = a milestone item
  -- Placement: all three set (in a tank) or all three null (in your inventory).
  tank integer check (tank >= 0),
  x real check (x between 0 and 100), -- % across the tank
  y real check (y between 0 and 1), -- 0 = front of the sand, 1 = back
  created_at timestamptz not null default now(),
  constraint decorations_placed_fully check ((tank is null) = (x is null) and (x is null) = (y is null))
);

create index decorations_user_idx on public.decorations (user_id);
-- Milestone items are free and can be claimed once each.
create unique index decorations_one_free_each on public.decorations (user_id, item) where price = 0;

alter table public.decorations enable row level security;

-- Read: you only see your own decorations.
create policy "Users can read their own decorations"
  on public.decorations for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Buy / claim: a new row must carry your own user_id.
create policy "Users can insert their own decorations"
  on public.decorations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Place / move / remove: only your own rows, and they must stay yours.
create policy "Users can update their own decorations"
  on public.decorations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy: bought items are owned forever.
grant select, insert on table public.decorations to authenticated;
-- Updates may only touch the placement, so a price can't be edited afterwards.
grant update (tank, x, y) on table public.decorations to authenticated;

-- ---------- Tank skins ----------

-- One row per tank whose skin you've changed; no row = the default (Shallows).
create table public.tank_skins (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tank integer not null check (tank >= 0),
  skin text not null check (char_length(skin) between 1 and 40), -- e.g. 'pond'
  primary key (user_id, tank)
);

alter table public.tank_skins enable row level security;

-- Read: only your own tanks' skins.
create policy "Users can read their own tank skins"
  on public.tank_skins for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Choose a skin for a tank for the first time: the row must be yours.
create policy "Users can insert their own tank skins"
  on public.tank_skins for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Change it later (the app upserts): only your rows, and they stay yours.
create policy "Users can update their own tank skins"
  on public.tank_skins for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.tank_skins to authenticated;
