import { supabase } from './supabase';
import type { Emotion, RosterEntry } from '../types';

/** Supabase 가 돌려준 오류를 코드와 함께 실어 나른다. 중복 제출(23505)을 구분해야 한다. */
export class ApiError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }

  /** 오늘 이미 기록해서 거부된 경우인지. */
  get isDuplicate(): boolean {
    return this.code === '23505' || /이미 기록/.test(this.message);
  }
}

export async function fetchEmotions(): Promise<Emotion[]> {
  const { data, error } = await supabase
    .from('emotions')
    .select('code, label, valence, color, bucket')
    .order('sort_order');

  if (error) throw new ApiError(error.message, error.code);
  return (data ?? []) as Emotion[];
}

/** 학급코드가 맞을 때만 명단이 나온다. 틀리면 빈 배열이다. */
export async function fetchRoster(code: string): Promise<RosterEntry[]> {
  const { data, error } = await supabase.rpc('roster_by_code', {
    p_code: code,
  });

  if (error) throw new ApiError(error.message, error.code);
  return (data ?? []) as RosterEntry[];
}

/**
 * 선생님께 보내는 비밀편지.
 *
 * 익명으로 보내면 DB 에 보낸 사람을 아예 저장하지 않는다. 화면에서만 가리는 게
 * 아니라 기록 자체가 남지 않아야, 나중에도 누가 썼는지 되짚을 수 없다.
 */
export async function sendLetter(args: {
  code: string;
  studentId: string;
  body: string;
  anonymous: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('send_letter', {
    p_code: args.code,
    p_student: args.studentId,
    p_body: args.body.trim(),
    p_anonymous: args.anonymous,
  });

  if (error) throw new ApiError(error.message, error.code);
}

export async function submitCheckin(args: {
  code: string;
  studentId: string;
  emotion: string;
  note: string;
  score: number;
}): Promise<void> {
  const { error } = await supabase.rpc('submit_checkin', {
    p_code: args.code,
    p_student: args.studentId,
    p_emotion: args.emotion,
    p_note: args.note.trim() || null,
    p_score: args.score,
  });

  if (error) throw new ApiError(error.message, error.code);
}
