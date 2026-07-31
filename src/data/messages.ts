/** 비어 있지 않은 목록에서 하나를 고른다. 튜플 타입이라 undefined 가 나올 수 없다. */
export function pick<T>(items: readonly [T, ...T[]]): T {
  const i = Math.floor(Math.random() * items.length);
  return items[i] ?? items[0];
}

/**
 * 메모란 안내문구. 들어올 때마다 바뀌어서 "적어도 되는구나" 하고 느끼게 한다.
 * 강요하지 않되 문을 열어두는 말투로 쓴다.
 */
export const NOTE_HINTS: readonly [string, ...string[]] = [
  '내 감정을 구체적으로 이야기해주면, 더 좋은 하루가 될 수 있어!',
  '오늘 마음속에서 무슨 일이 있었어?',
  '선생님만 볼 거야. 편하게 적어도 괜찮아.',
  '왜 그런 기분이 들었는지 살짝 알려줄래?',
  '짧아도 좋아. 한 줄이면 충분해!',
  '말로 하기 어려우면, 여기에 적어봐.',
  '오늘 하루를 어떻게 시작하고 싶어?',
  '적어두면 나중에 네 마음이 보여.',
  '어떤 기분이든 다 소중해. 그대로 적어줘.',
  '무슨 일이 있었는지 들려줄래?',
  '오늘의 나에게 한마디 남겨볼까?',
  '고민이 있으면 여기에 살짝 적어둬.',
];

/**
 * 오늘의 컨디션 1~5점.
 * 감정 캐릭터가 "어떤 마음인지"라면, 이 점수는 "몸과 마음이 어떤 상태인지"다.
 * 둘이 다를 수 있어서 따로 받는다 — 웃고 있어도 몸이 힘든 날이 있다.
 */
export const CONDITION_LEVELS: readonly { score: number; label: string }[] = [
  { score: 5, label: '아주 좋아' },
  { score: 4, label: '좋아' },
  { score: 3, label: '그냥 그래' },
  { score: 2, label: '별로야' },
  { score: 1, label: '많이 힘들어' },
];

/** 고른 감정의 valence 에 따라 완료 화면 문구를 고른다. */
export function closingFor(valence: number): string {
  if (valence >= 1) return pick(['오늘도 잘 왔어!', '그 기분 그대로 가자!']);
  if (valence === 0) return pick(['잘 왔어!', '오늘도 함께해줘서 고마워.']);
  return pick(['이야기해줘서 고마워.', '오늘은 선생님이 더 살펴볼게.']);
}
