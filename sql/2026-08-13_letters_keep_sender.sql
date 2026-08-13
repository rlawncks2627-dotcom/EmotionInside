-- 익명 편지에도 보낸 사람을 남긴다 (담임 요청)
--
-- 처음에는 익명이면 student_id 를 아예 저장하지 않았다(sql/2026-08-13_letters.sql).
-- 담임이 살펴봐야 할 아이를 찾을 수 없다는 문제가 있어, 번호를 알 수 있도록 바꾼다.
-- 편지함에는 여전히 [익명] 이 붙고, 그 옆에 번호만 적는다.
--
-- 주의: 학생 화면 안내는 「선생님께는 「익명」 이라고만 보여」 그대로다.
-- 실제로는 번호가 남으므로, 담임이 이 편지를 다룰 때 그 점을 알고 있어야 한다.
-- 편지함 안내문에 그렇게 적어두었다.
--
-- 이 마이그레이션 이전에 익명으로 온 편지는 student_id 가 없다. 되살릴 수 없으므로
-- 그 편지들은 앞으로도 번호 없이 [익명] 으로만 보인다.

alter table public.letters drop constraint if exists letters_anon_has_no_sender;

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

  -- 익명이든 아니든 보낸 사람을 남긴다. 화면에서 가리는 것은 편지함 쪽 일이다.
  insert into public.letters (class_id, student_id, is_anonymous, body)
  values (v_class, p_student, coalesce(p_anonymous, false), v_body);
end;
$$;

-- create or replace 를 하면 Supabase 가 anon/authenticated 에 EXECUTE 를 다시 붙인다.
-- 여기서는 둘 다 필요하므로 그대로 두되, 의도한 상태임을 남겨둔다.
revoke all on function public.send_letter(text, uuid, text, boolean) from public;
grant execute on function public.send_letter(text, uuid, text, boolean) to anon, authenticated;
