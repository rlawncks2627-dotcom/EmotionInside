/** 감정 종류. valence 는 -2(가장 힘듦) ~ +2(가장 좋음). */
export interface Emotion {
  code: string;
  label: string;
  valence: number;
  color: string;
}

/** roster_by_code 가 돌려주는 한 줄. 감정 기록 내용은 절대 포함되지 않는다. */
export interface RosterEntry {
  student_id: string;
  student_no: number;
  student_name: string;
  class_label: string;
  submitted: boolean;
}

/** 기기에 기억해두는 학생. 개인 기기라 다음 날 아침 곧장 감정 고르기로 간다. */
export interface SavedStudent {
  id: string;
  name: string;
  label: string;
}

/**
 * 완료 화면에 필요한 것.
 * 앱을 다시 열었을 때는 어떤 감정을 골랐는지 알 수 없다 —
 * 명단 조회는 제출 여부만 돌려주기 때문이다. 그 경우가 revisited 다.
 */
export type DoneResult =
  | { kind: 'submitted'; emotion: Emotion; note: string }
  | { kind: 'revisited'; name: string };
