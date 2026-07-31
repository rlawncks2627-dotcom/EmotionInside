import { createClient } from '@supabase/supabase-js';

// 두 값 모두 브라우저에 노출되어도 되는 공개 키다.
// 실제 접근 제어는 DB 의 RLS 정책이 한다. 서비스 롤 키는 절대 여기에 두지 않는다.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    '.env 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_PUBLISHABLE_KEY 가 있어야 합니다. ' +
      '.env.example 을 복사해서 채워주세요.',
  );
}

export const supabase = createClient(url, key);
