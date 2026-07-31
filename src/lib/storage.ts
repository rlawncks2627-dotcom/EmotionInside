import type { SavedStudent } from '../types';

const KEY_CODE = 'ei.code';
const KEY_STUDENT = 'ei.student';

// 사생활 보호 모드에서는 localStorage 접근이 예외를 던진다.
// 기억을 못 할 뿐 앱은 계속 돌아가야 하므로 조용히 넘긴다.

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 기억하지 못해도 그냥 진행한다 */
  }
}

function clear(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* 무시 */
  }
}

export const savedCode = {
  get: () => read<string>(KEY_CODE),
  set: (code: string) => write(KEY_CODE, code),
  clear: () => clear(KEY_CODE),
};

export const savedStudent = {
  get: () => read<SavedStudent>(KEY_STUDENT),
  set: (student: SavedStudent) => write(KEY_STUDENT, student),
  clear: () => clear(KEY_STUDENT),
};
