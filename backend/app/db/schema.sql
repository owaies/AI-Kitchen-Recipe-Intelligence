create extension if not exists pgcrypto;

create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    dietary_preferences jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists pantry_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    quantity numeric(12,3),
    unit text,
    category text,
    expires_on date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint pantry_items_name_nonempty check (length(trim(name)) > 0),
    constraint pantry_items_quantity_nonnegative check (quantity is null or quantity >= 0)
);

create table if not exists saved_recipes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    source text,
    recipe_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint saved_recipes_title_nonempty check (length(trim(title)) > 0)
);

create table if not exists meal_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    plan_date date not null,
    meal_type text not null,
    recipe_id uuid references saved_recipes(id) on delete set null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint meal_plans_meal_type check (meal_type in ('breakfast','lunch','dinner','snack'))
);

create table if not exists shopping_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    quantity numeric(12,3),
    unit text,
    category text,
    is_purchased boolean not null default false,
    source text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint shopping_items_name_nonempty check (length(trim(name)) > 0),
    constraint shopping_items_quantity_nonnegative check (quantity is null or quantity >= 0)
);

create index if not exists pantry_items_user_expiry_idx
    on pantry_items(user_id, expires_on);

create index if not exists meal_plans_user_date_idx
    on meal_plans(user_id, plan_date);

create index if not exists shopping_items_user_purchased_idx
    on shopping_items(user_id, is_purchased);

alter table profiles enable row level security;
alter table pantry_items enable row level security;
alter table saved_recipes enable row level security;
alter table meal_plans enable row level security;
alter table shopping_items enable row level security;

create policy profiles_owner_select on profiles for select using (auth.uid() = id);
create policy profiles_owner_insert on profiles for insert with check (auth.uid() = id);
create policy profiles_owner_update on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy pantry_owner_all on pantry_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy saved_recipes_owner_all on saved_recipes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy meal_plans_owner_all on meal_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy shopping_items_owner_all on shopping_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
