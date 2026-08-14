create table if not exists public.schedules (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  trial_date text check (trial_date is null or trial_date ~ '^\d{4}-\d{2}-\d{2}$'),
  status text not null check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  service_category text not null check (service_category in ('bridal', 'daily')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_data_id_match check (data ->> 'id' = id::text),
  constraint schedules_data_date_match check (data ->> 'date' = date),
  constraint schedules_data_status_match check (data ->> 'status' = status),
  constraint schedules_data_service_category_match check (data ->> 'serviceCategory' = service_category)
);

create index if not exists schedules_user_id_date_idx
  on public.schedules (user_id, date);

create index if not exists schedules_user_id_updated_at_idx
  on public.schedules (user_id, updated_at desc);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.schedules enable row level security;
alter table public.app_settings enable row level security;

create policy "Users can read own schedules"
  on public.schedules for select
  using (auth.uid() = user_id);

create policy "Users can insert own schedules"
  on public.schedules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own schedules"
  on public.schedules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own schedules"
  on public.schedules for delete
  using (auth.uid() = user_id);

create policy "Users can read own settings"
  on public.app_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.app_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.app_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.replace_user_backup(
  p_schedules jsonb,
  p_settings jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  schedule_row jsonb;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if jsonb_typeof(p_schedules) <> 'array' then
    raise exception 'p_schedules must be an array';
  end if;

  if jsonb_typeof(p_settings) <> 'object' then
    raise exception 'p_settings must be an object';
  end if;

  if coalesce(p_settings ->> 'user_id', '') <> current_user_id::text then
    raise exception 'settings user_id mismatch';
  end if;

  delete from public.schedules where user_id = current_user_id;

  for schedule_row in select value from jsonb_array_elements(p_schedules) loop
    if coalesce(schedule_row ->> 'user_id', '') <> current_user_id::text then
      raise exception 'schedule user_id mismatch';
    end if;

    insert into public.schedules (
      id,
      user_id,
      date,
      trial_date,
      status,
      service_category,
      data,
      created_at,
      updated_at
    ) values (
      (schedule_row ->> 'id')::uuid,
      current_user_id,
      schedule_row ->> 'date',
      nullif(schedule_row ->> 'trial_date', ''),
      schedule_row ->> 'status',
      schedule_row ->> 'service_category',
      schedule_row -> 'data',
      coalesce((schedule_row ->> 'created_at')::timestamptz, now()),
      coalesce((schedule_row ->> 'updated_at')::timestamptz, now())
    );
  end loop;

  insert into public.app_settings (user_id, data, created_at, updated_at)
  values (
    current_user_id,
    p_settings -> 'data',
    coalesce((p_settings ->> 'created_at')::timestamptz, now()),
    coalesce((p_settings ->> 'updated_at')::timestamptz, now())
  )
  on conflict (user_id) do update set
    data = excluded.data,
    created_at = public.app_settings.created_at,
    updated_at = excluded.updated_at;
end;
$$;
