-- Trading Cards prototype schema
-- RLS is left disabled for this MVP (matches fanzone's approach) — the backend
-- uses the Supabase service-role key, which bypasses RLS regardless.

-- ============================================================
-- profiles
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_creator boolean not null default false,
  coin_balance int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- artworks — one uploaded source image per row
-- ============================================================
create table artworks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Untitled',
  orientation text not null check (orientation in ('vertical', 'horizontal')),
  storage_path text not null,
  width int,
  height int,
  status text not null default 'draft' check (status in ('draft', 'generated', 'published')),
  created_at timestamptz not null default now()
);
create index idx_artworks_creator_id on artworks(creator_id);

-- ============================================================
-- card_sets — one "publish" grouping of generated templates per artwork
-- ============================================================
create table card_sets (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references artworks(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  name text not null default 'Untitled Set',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_card_sets_artwork_id on card_sets(artwork_id);
create index idx_card_sets_creator_id on card_sets(creator_id);

-- ============================================================
-- card_templates — one row per rarity tier within a set
-- ============================================================
create table card_templates (
  id uuid primary key default gen_random_uuid(),
  card_set_id uuid not null references card_sets(id) on delete cascade,
  rarity_tier text not null check (rarity_tier in ('common', 'rare', 'epic', 'legendary', 'ultra_100', 'one_of_one')),
  frame_style text not null,
  effect_style text not null,
  print_run_cap int, -- null = uncapped
  editions_claimed int not null default 0,
  weight numeric not null,
  created_at timestamptz not null default now(),
  unique (card_set_id, rarity_tier)
);
create index idx_card_templates_card_set_id on card_templates(card_set_id);

-- ============================================================
-- packs — purchasable bundles
-- ============================================================
create table packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pack_type text not null default 'concert' check (pack_type in ('concert', 'solo')),
  price_coins int not null,
  card_count int not null default 5,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- pack_pool_entries — which templates a pack draws from
-- ============================================================
create table pack_pool_entries (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references packs(id) on delete cascade,
  card_template_id uuid not null references card_templates(id) on delete cascade,
  unique (pack_id, card_template_id)
);
create index idx_pack_pool_entries_pack_id on pack_pool_entries(pack_id);
create index idx_pack_pool_entries_card_template_id on pack_pool_entries(card_template_id);

-- ============================================================
-- pack_purchases — one header row per pack-opening event
-- ============================================================
create table pack_purchases (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references packs(id),
  buyer_id uuid not null references profiles(id),
  coins_spent int not null,
  created_at timestamptz not null default now()
);
create index idx_pack_purchases_pack_id on pack_purchases(pack_id);
create index idx_pack_purchases_buyer_id on pack_purchases(buyer_id);

-- ============================================================
-- card_editions — one row per claimed/owned card instance
-- ============================================================
create table card_editions (
  id uuid primary key default gen_random_uuid(),
  card_template_id uuid not null references card_templates(id),
  edition_number int, -- null when the tier is uncapped
  owner_id uuid not null references profiles(id),
  acquired_via text not null default 'pack',
  visual_seed int not null,
  pack_purchase_id uuid references pack_purchases(id),
  created_at timestamptz not null default now()
);
create index idx_card_editions_card_template_id on card_editions(card_template_id);
create index idx_card_editions_owner_id on card_editions(owner_id);
create index idx_card_editions_pack_purchase_id on card_editions(pack_purchase_id);
-- a numbered edition (e.g. "7 of 100") can only ever be claimed once
create unique index uq_card_editions_template_edition_number
  on card_editions(card_template_id, edition_number)
  where edition_number is not null;

-- ============================================================
-- coin_ledger — append-only; profiles.coin_balance is a denormalized cache
-- ============================================================
create table coin_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  amount int not null, -- negative = spend, positive = grant
  reason text not null check (reason in ('seed', 'pack_purchase')),
  related_pack_purchase_id uuid references pack_purchases(id),
  created_at timestamptz not null default now()
);
create index idx_coin_ledger_profile_id on coin_ledger(profile_id);

-- ============================================================
-- Row Level Security — enabled with NO policies on every table below.
-- That's intentional: this app's frontend never queries Postgres directly,
-- it only calls the backend API, which uses the service-role key (which
-- always bypasses RLS). So "no policies" = the anon/authenticated roles get
-- zero direct table access, closing off the public anon key as a bypass
-- around the backend's business logic (coin balances, print-run caps, etc).
-- If you ever need the frontend to query a table directly, add a scoped
-- policy for that table rather than disabling RLS wholesale.
-- ============================================================
alter table profiles enable row level security;
alter table artworks enable row level security;
alter table card_sets enable row level security;
alter table card_templates enable row level security;
alter table packs enable row level security;
alter table pack_pool_entries enable row level security;
alter table pack_purchases enable row level security;
alter table card_editions enable row level security;
alter table coin_ledger enable row level security;

-- ============================================================
-- Storage bucket for uploaded artwork originals (public read)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('artwork-originals', 'artwork-originals', true)
on conflict (id) do nothing;

-- ============================================================
-- open_pack: atomically deduct coins, draw card_count templates by weight
-- (respecting print-run caps), mint card_editions, and return them.
-- ============================================================
create or replace function open_pack(p_pack_id uuid, p_buyer_id uuid)
returns table (
  edition_id uuid,
  card_template_id uuid,
  rarity_tier text,
  frame_style text,
  effect_style text,
  edition_number int,
  print_run_cap int,
  visual_seed int
) language plpgsql as $$
declare
  v_price int;
  v_card_count int;
  v_balance int;
  v_purchase_id uuid;
  v_i int := 0;
  v_pick numeric;
  v_total_weight numeric;
  v_template_id uuid;
  v_rarity_tier text;
  v_frame_style text;
  v_effect_style text;
  v_print_run_cap int;
  v_new_claimed int;
  v_edition_number int;
  v_visual_seed int;
  v_edition_id uuid;
begin
  select price_coins, card_count into v_price, v_card_count
  from packs
  where id = p_pack_id and status = 'active'
  for update;

  if not found then
    raise exception 'Pack not found or inactive';
  end if;

  select coin_balance into v_balance
  from profiles
  where id = p_buyer_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_balance < v_price then
    raise exception 'Insufficient coins';
  end if;

  update profiles set coin_balance = coin_balance - v_price where id = p_buyer_id;

  insert into pack_purchases (pack_id, buyer_id, coins_spent)
  values (p_pack_id, p_buyer_id, v_price)
  returning id into v_purchase_id;

  insert into coin_ledger (profile_id, amount, reason, related_pack_purchase_id)
  values (p_buyer_id, -v_price, 'pack_purchase', v_purchase_id);

  while v_i < v_card_count loop
    v_i := v_i + 1;

    select sum(ct.weight) into v_total_weight
    from pack_pool_entries ppe
    join card_templates ct on ct.id = ppe.card_template_id
    where ppe.pack_id = p_pack_id
      and ct.weight > 0
      and (ct.print_run_cap is null or ct.editions_claimed < ct.print_run_cap);

    if v_total_weight is null or v_total_weight <= 0 then
      raise exception 'Pack pool exhausted — no drawable cards remain';
    end if;

    v_pick := random() * v_total_weight;

    select ct.id, ct.rarity_tier, ct.frame_style, ct.effect_style, ct.print_run_cap
    into v_template_id, v_rarity_tier, v_frame_style, v_effect_style, v_print_run_cap
    from (
      select ct.id, ct.rarity_tier, ct.frame_style, ct.effect_style, ct.print_run_cap,
             sum(ct.weight) over (order by ct.id) as cum_weight
      from pack_pool_entries ppe
      join card_templates ct on ct.id = ppe.card_template_id
      where ppe.pack_id = p_pack_id
        and ct.weight > 0
        and (ct.print_run_cap is null or ct.editions_claimed < ct.print_run_cap)
    ) ct
    where cum_weight >= v_pick
    order by cum_weight
    limit 1;

    -- atomically claim the slot; re-checks the cap so concurrent buyers can't
    -- both win the same numbered edition. Table alias "ct" is required here
    -- (not just style) — this function's RETURNS TABLE declares an internal
    -- print_run_cap variable, which a bare column reference would collide with.
    update card_templates as ct
    set editions_claimed = ct.editions_claimed + 1
    where ct.id = v_template_id
      and (ct.print_run_cap is null or ct.editions_claimed < ct.print_run_cap)
    returning ct.editions_claimed into v_new_claimed;

    if not found then
      raise exception 'Pack pool exhausted — please retry your purchase';
    end if;

    v_edition_number := case when v_print_run_cap is null then null else v_new_claimed end;
    v_visual_seed := floor(random() * 1000000)::int;

    insert into card_editions (card_template_id, edition_number, owner_id, acquired_via, visual_seed, pack_purchase_id)
    values (v_template_id, v_edition_number, p_buyer_id, 'pack', v_visual_seed, v_purchase_id)
    returning id into v_edition_id;

    edition_id := v_edition_id;
    card_template_id := v_template_id;
    rarity_tier := v_rarity_tier;
    frame_style := v_frame_style;
    effect_style := v_effect_style;
    edition_number := v_edition_number;
    print_run_cap := v_print_run_cap;
    visual_seed := v_visual_seed;
    return next;
  end loop;
end;
$$;
