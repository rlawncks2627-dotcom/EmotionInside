-- 선생님께 보내는 비밀편지
--
-- ⚠️ 아래 「익명이면 보낸 사람을 저장하지 않는다」 부분은 같은 날
--    sql/2026-08-13_letters_keep_sender.sql 로 뒤집혔습니다. 지금은 익명 편지에도
--    student_id 를 남기고, 편지함에서 [익명] + 번호로 보여줍니다. 그 파일을 함께 보세요.
--
-- 학생 화면은 로그인하지 않으므로 letters 테이블은 익명에게 완전히 잠그고,
-- 학급코드를 아는 경우에만 동작하는 send_letter() 로만 들어오게 한다.
-- (기존 roster_by_code / submit_checkin 과 같은 설계다.)
--
-- 익명으로 보낸 편지는 student_id 를 아예 저장하지 않는다. 나중에도 되짚을 수
-- 없어야 아이에게 한 약속이 지켜진다. 대신 is_anonymous 를 따로 남겨,
-- 담임이 "이건 익명으로 보내려고 한 편지" 라는 것을 알 수 있게 한다.

-- ── 테이블 ────────────────────────────────────────────────

create table if not exists public.letters (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  -- 익명이면 null. 실명이면 보낸 학생.
  student_id   uuid references public.students(id) on delete set null,
  is_anonymous boolean not null default false,
  body         text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,

  constraint letters_body_len check (char_length(body) between 1 and 1000),
  -- 익명 편지에 보낸 사람이 남아 있으면 익명이 아니다. DB 에서 못 박는다.
  constraint letters_anon_has_no_sender check (not is_anonymous or student_id is null)
);

create index if not exists letters_class_created_idx
  on public.letters (class_id, created_at desc);

-- 배지에 쓰는 "안 읽은 편지" 를 빨리 센다.
create index if not exists letters_unread_idx
  on public.letters (class_id) where read_at is null;

alter table public.letters enable row level security;

-- Supabase 는 public 스키마 테이블에 anon/authenticated 권한을 자동으로 준다.
-- 학생(익명)은 RPC 로만 들어와야 하므로 테이블 권한 자체를 회수한다.
revoke all on table public.letters from anon;

-- ── 학급 소유 확인 ────────────────────────────────────────
-- 정책 안에서 classes 를 직접 읽으면 classes 의 RLS 가 다시 걸린다.
-- SECURITY DEFINER 함수로 한 번에 판정한다.

create or replace function public.owns_class(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.classes c
    where c.id = p_class and c.teacher_id = auth.uid()
  );
$$;

revoke all on function public.owns_class(uuid) from public, anon;
grant execute on function public.owns_class(uuid) to authenticated;

-- ── 정책 ──────────────────────────────────────────────────
-- 담임은 자기 반 편지를 읽기만 한다. UPDATE 정책은 일부러 두지 않는다 —
-- 정책으로 열면 read_at 뿐 아니라 편지 내용까지 고칠 수 있게 된다.
-- 읽음 표시는 아래 mark_letters_read() 가 대신한다.

drop policy if exists "담임은 자기 반 편지를 읽는다" on public.letters;
create policy "담임은 자기 반 편지를 읽는다"
  on public.letters for select to authenticated
  using (public.owns_class(class_id));

-- ── 학생이 편지를 보낸다 (익명 호출) ──────────────────────

create or replace function public.send_letter(
  p_code      text,
  p_student   uuid,
  p_body      text,
  p_anonymous boolean default false
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_class uuid;
  v_body  text;
  v_anon  boolean := coalesce(p_anonymous, false);
begin
  select c.id into v_class
  from public.students s
  join public.classes c on c.id = s.class_id
  where s.id = p_student
    and c.join_code = upper(btrim(p_code));

  if v_class is null then
    raise exception '학급코드와 학생이 맞지 않습니다.' using errcode = '42501';
  end if;

  v_body := btrim(coalesce(p_body, ''));

  if v_body = '' then
    raise exception '편지 내용을 적어주세요.';
  end if;
  if char_length(v_body) > 1000 then
    raise exception '편지는 1000자까지 쓸 수 있어요.';
  end if;

  insert into public.letters (class_id, student_id, is_anonymous, body)
  values (v_class, case when v_anon then null else p_student end, v_anon, v_body);
end;
$$;

revoke all on function public.send_letter(text, uuid, text, boolean) from public;
grant execute on function public.send_letter(text, uuid, text, boolean) to anon, authenticated;

-- ── 담임이 읽음 표시를 한다 ───────────────────────────────

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
   where class_id = p_class and read_at is null;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.mark_letters_read(uuid) from public, anon;
grant execute on function public.mark_letters_read(uuid) to authenticated;
