-- Fish species: when a study session ends (completed or partial, 5+ credited
-- minutes) its fry hatches into a species, which is SAVED on the session. The
-- session's length only sets the odds (lib/species.ts), so tuning them later
-- never changes a fish already caught. null = this session made no fish.

alter table public.sessions
  add column species text
  constraint sessions_species_check check (species in (
    'green_chromis', 'blue_damselfish', 'royal_gramma', 'sergeant_major',
    'clownfish', 'pufferfish', 'seahorse', 'emperor_angelfish',
    'lionfish', 'mandarinfish', 'blue_tang', 'moorish_idol',
    'oarfish', 'sunfish', 'manta_ray',
    'coelacanth', 'dunkleosteus', 'megalodon'
  ));
-- (A check passes for null, so sessions without a fish are fine.)

-- No new grant needed: "grant select, insert on public.sessions" covers new
-- columns. Still no update policy, so a saved species can never be changed.

-- Backfill: give every existing fish its species ONCE, exactly as the app
-- would (hatch() in lib/species.ts):
--   * tier roll = the first 8 hex digits of the id, a whole number 0 … 2^32-1
--   * pick roll = the last 8 hex digits
--   * tier = the first one where  tier_roll × 100 < (running total of %) × 2^32
--   * species = that tier's list[pick_roll mod list length]  (lists in app order)
-- Odds bands by credited minutes (focus_seconds / 60, rounded down), as running
-- totals: common, +uncommon, +rare, +epic (legendary is the rest).
with rolls as (
  select
    id,
    focus_seconds / 60 as minutes,
    ('x' || lpad(substr(replace(id::text, '-', ''), 1, 8), 16, '0'))::bit(64)::bigint as tier_roll,
    ('x' || lpad(substr(replace(id::text, '-', ''), 25, 8), 16, '0'))::bit(64)::bigint as pick_roll
  from public.sessions
  where species is null
    and session_type = 'study'
    and outcome <> 'failed'
    and focus_seconds >= 300
),
bands (from_minutes, c1, c2, c3, c4) as (
  values
    (5, 80, 98, 100, 100),  -- 5–24 min:  80 / 18 / 2 / 0 / 0
    (25, 50, 85, 98, 100),  -- 25–49 min: 50 / 35 / 13 / 2 / 0
    (50, 25, 60, 88, 98),   -- 50–89 min: 25 / 35 / 28 / 10 / 2
    (90, 10, 35, 70, 92)    -- 90+ min:   10 / 25 / 35 / 22 / 8
),
tiers as (
  select
    r.id,
    r.pick_roll,
    case
      when r.tier_roll * 100 < b.c1 * 4294967296 then 'common'
      when r.tier_roll * 100 < b.c2 * 4294967296 then 'uncommon'
      when r.tier_roll * 100 < b.c3 * 4294967296 then 'rare'
      when r.tier_roll * 100 < b.c4 * 4294967296 then 'epic'
      else 'legendary'
    end as rarity
  from rolls r
  cross join lateral (
    select * from bands where from_minutes <= r.minutes order by from_minutes desc limit 1
  ) b
)
update public.sessions s
set species = case t.rarity
  when 'common' then (array['green_chromis', 'blue_damselfish', 'royal_gramma', 'sergeant_major'])[(t.pick_roll % 4)::int + 1]
  when 'uncommon' then (array['clownfish', 'pufferfish', 'seahorse', 'emperor_angelfish'])[(t.pick_roll % 4)::int + 1]
  when 'rare' then (array['lionfish', 'mandarinfish', 'blue_tang', 'moorish_idol'])[(t.pick_roll % 4)::int + 1]
  when 'epic' then (array['oarfish', 'sunfish', 'manta_ray'])[(t.pick_roll % 3)::int + 1]
  else (array['coelacanth', 'dunkleosteus', 'megalodon'])[(t.pick_roll % 3)::int + 1]
end
from tiers t
where s.id = t.id;
