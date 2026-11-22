-- DESTINY OS · Phase 3 스키마 초안 (PostgreSQL 15+ / Supabase)
-- 민감 컬럼(*_enc)은 애플리케이션 계층에서 KMS envelope 암호화 후 bytea로 저장한다.

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table birth_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  nickname text not null check (char_length(nickname) <= 20),
  calendar text not null check (calendar in ('solar','lunar')),
  is_leap_month boolean not null default false,
  birth_date_enc bytea not null,
  birth_time_enc bytea,                -- null = 출생시간 모름
  city_id text not null,
  sex text check (sex in ('male','female')),  -- null = 선택하지 않음
  policy jsonb not null default '{"timeBasis":"lmt","ziPolicy":"zi23"}',
  is_self boolean not null default true,
  created_at timestamptz not null default now()
);

create table partners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  alias text not null check (char_length(alias) <= 20),
  birth_date_enc bytea not null,
  birth_time_enc bytea,
  calendar text not null, is_leap_month boolean not null default false,
  city_id text not null,
  relation_type text not null,
  consent_method text not null,        -- 'self_declared' | 'invite_link'
  consented_at timestamptz not null,
  expires_at timestamptz not null default now() + interval '30 days'
);

create table archive_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('event','goal','question','review')),
  year int not null check (year between 1901 and 2150),
  month int check (month between 1 and 12),
  title_enc bytea not null,
  note_enc bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table interpretation_rules (
  rule_id text not null,
  version text not null,
  rule_name text not null,
  source_title text not null,
  source_location text,                -- 원문 대조 전 null
  school text not null,
  conditions jsonb not null,
  interpretation text not null,
  alternative_interpretations text[] not null default '{}',
  conflicts text[] not null default '{}',
  review_status text not null check (review_status in ('draft','in_review','approved','retired')),
  confidence_in_source text not null check (confidence_in_source in ('unknown','low','medium','high')),
  last_reviewed_at timestamptz,
  primary key (rule_id, version)
);

create table rule_reviews (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null, version text not null,
  reviewer text not null, decision text not null, note text,
  reviewed_at timestamptz not null default now(),
  foreign key (rule_id, version) references interpretation_rules(rule_id, version)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  product_code text not null,          -- 'MASTER_REPORT_V1'
  amount int not null check (amount > 0),
  status text not null check (status in ('created','paid','canceled','refunded')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  provider text not null default 'toss',
  payment_key text not null unique,
  approved_amount int not null,
  approved_at timestamptz not null,
  raw_masked jsonb not null            -- 카드번호 등 마스킹된 응답만
);

create table entitlements (
  owner_id uuid not null references users(id) on delete cascade,
  product_code text not null,
  order_id uuid not null references orders(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (owner_id, product_code, order_id)
);

create table report_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  profile_id uuid not null references birth_profiles(id) on delete cascade,
  engine_version text not null,
  rules_version text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

-- 행 단위 접근 통제(Supabase RLS)
alter table birth_profiles enable row level security;
alter table partners enable row level security;
alter table archive_records enable row level security;
alter table report_snapshots enable row level security;
alter table orders enable row level security;
create policy own_profiles on birth_profiles using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_partners on partners using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_records on archive_records using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_reports on report_snapshots using (owner_id = auth.uid());
create policy own_orders on orders using (owner_id = auth.uid());
-- payments / entitlements 쓰기는 service role(서버)만. interpretation_rules 쓰기는 관리자 역할만.
