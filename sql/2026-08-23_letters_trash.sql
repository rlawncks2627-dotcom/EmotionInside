-- 편지 삭제와 휴지통
--
-- 편지함에 편지가 쌓여 담임이 다루기 어렵다는 요청에서 나왔다.
-- 지운 편지가 곧바로 사라지면 잘못 지웠을 때 되돌릴 방법이 없으므로,
-- 삭제는 deleted_at 을 찍는 것으로만 하고 휴지통에서 한 번 더 확인받는다.
--
-- 휴지통에서 30일이 지난 편지는 스스로 사라진다. 별도 스케줄러(pg_cron)를 두지 않고,
-- 담임이 편지함을 열 때 purge_old_deleted_letters() 를 먼저 부르는 방식이다.
-- 편지는 그 반 담임만 보는 자료라, 아무도 편지함을 열지 않는 동안 남아 있는 것은
-- 문제가 되지 않는다. 확장 기능을 켜지 않아도 되는 쪽을 골랐다.
--
-- letters 는 담임에게 SELECT 정책만 준다는 원칙(sql/2026-08-13_letters.sql)을 그대로 지킨다.
-- UPDATE 정책을 열면 deleted_at 뿐 아니라 편지 본문까지 고칠 수 있게 되므로,
-- 삭제·복원·비우기는 전부 아래 SECURITY DEFINER 함수로만 한다.

-- ── 컬럼 ──────────────────────────────────────────────────

-- null 이면 편지함에, 값이 있으면 휴지통에 있는 편지다.
alter table public.letters
  add column if not exists deleted_at timestamptz;

-- 휴지통 목록과 30일 정리가 모두 이 색인을 쓴다.
create index if not exists letters_trash_idx
  on public.letters (class_id, deleted_at desc)
  where deleted_at is not null;

-- 안 읽은 편지 배지에는 휴지통에 넣은 편지가 잡히면 안 된다.
-- 조건이 바뀌었으므로 색인을 다시 만든다.
drop index if exists public.letters_unread_idx;
create index if not exists letters_unread_idx
  on public.letters (class_id)
  where read_at is null and deleted_at is null;

-- ── 편지 하나를 휴지통으로 ────────────────────────────────

create or replace function public.delete_letter(p_letter uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_class uuid;
begin
  select class_id into v_class from public.letters where id = p_letter;

  -- 없는 편지와 남의 반 편지를 같은 말로 돌려준다. 다른 말을 하면 편지 id 를
  -- 하나씩 넣어보는 것만으로 다른 반에 편지가 있는지 알 수 있게 된다.
  if v_class is null or not public.owns_class(v_class) then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  update public.letters
     set deleted_at = now()
   where id = p_letter and deleted_at is null;
end;
$$;

revoke all on function public.delete_letter(uuid) from public, anon;
grant execute on function public.delete_letter(uuid) to authenticated;

-- ── 휴지통에서 되돌리기 ───────────────────────────────────

create or replace function public.restore_letter(p_letter uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_class uuid;
begin
  select class_id into v_class from public.letters where id = p_letter;

  if v_class is null or not public.owns_class(v_class) then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  update public.letters
     set deleted_at = null
   where id = p_letter;
end;
$$;

revoke all on function public.restore_letter(uuid) from public, anon;
grant execute on function public.restore_letter(uuid) to authenticated;

-- ── 휴지통 비우기 ─────────────────────────────────────────
-- 여기서부터는 되돌릴 수 없다. 화면에서 한 번 더 묻는다.

create or replace function public.empty_letter_trash(p_class uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare n integer;
begin
  if not public.owns_class(p_class) then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  delete from public.letters
   where class_id = p_class and deleted_at is not null;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.empty_letter_trash(uuid) from public, anon;
grant execute on function public.empty_letter_trash(uuid) to authenticated;

-- ── 버린 지 30일 지난 편지를 지운다 ───────────────────────
-- 편지함을 열 때마다 화면이 먼저 부른다. 지울 게 없으면 0 을 돌려준다.

create or replace function public.purge_old_deleted_letters(p_class uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare n integer;
begin
  if not public.owns_class(p_class) then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  delete from public.letters
   where class_id = p_class
     and deleted_at is not null
     and deleted_at < now() - interval '30 days';

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.purge_old_deleted_letters(uuid) from public, anon;
grant execute on function public.purge_old_deleted_letters(uuid) to authenticated;

-- ── 읽음 표시는 편지함에 있는 것만 ────────────────────────
-- 휴지통에 넣은 편지까지 읽음으로 바꾸면, 되돌렸을 때 「새 편지」 표시가 사라져 있다.

create or replace function public.mark_letters_read(p_class uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare n integer;
begin
  if not public.owns_class(p_class) then
    raise exception '권한이 없습니다.' using errcode = '42501';
  end if;

  update public.letters
     set read_at = now()
   where class_id = p_class and read_at is null and deleted_at is null;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- create or replace 를 하면 Supabase 가 public 스키마 함수에 anon/authenticated
-- EXECUTE 를 다시 붙인다. revoke ... from public 은 안 먹으므로 롤을 직접 지정한다.
revoke all on function public.mark_letters_read(uuid) from public, anon;
grant execute on function public.mark_letters_read(uuid) to authenticated;
