// 태블릿 한 대를 여러 학생이 돌려 쓴다.
// 그래서 학급 코드만 기억하고, 누가 썼는지는 절대 남기지 않는다.
// 학생을 기억해두면 다음 학생이 앞사람 화면으로 들어가 버린다.

const KEY_CODE = 'ei.code';
const LEGACY_KEY_STUDENT = 'ei.student';

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

/** 예전 판이 기기에 남겨둔 학생 정보를 지운다. 남아 있으면 앞사람 화면이 다시 뜬다. */
export function forgetLegacyStudent(): void {
  clear(LEGACY_KEY_STUDENT);
}
