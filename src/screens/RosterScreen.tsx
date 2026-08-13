import { useState } from 'react';

import type { RosterEntry } from '../types';

interface Props {
  rows: RosterEntry[];
  onPick: (entry: RosterEntry) => void;
  onLetter: (entry: RosterEntry) => void;
  onChangeClass: () => void;
}

/**
 * 이름 고르기. 이미 낸 사람은 표시되지만 감정 내용은 보이지 않는다.
 *
 * 편지 입구를 이 화면에 두는 이유: 오늘 기록을 마친 학생은 감정 화면으로 못 들어가서,
 * 감정 화면 안에만 입구가 있으면 편지를 아예 못 보낸다.
 */
export function RosterScreen({ rows, onPick, onLetter, onChangeClass }: Props) {
  const classLabel = rows[0]?.class_label ?? '';
  // 편지를 쓸 사람을 고르는 중인지. 편지는 기록을 마쳤든 아니든 누구나 보낼 수 있다.
  const [letterMode, setLetterMode] = useState(false);

  return (
    <>
      <div className="topbar">
        <span className="who">
          {classLabel}
          <button
            className="btn btn-ghost btn-letter"
            type="button"
            aria-pressed={letterMode}
            onClick={() => setLetterMode((on) => !on)}
          >
            💌 선생님께 비밀편지
          </button>
        </span>
        <button className="btn btn-ghost" type="button" onClick={onChangeClass}>
          반 바꾸기
        </button>
      </div>

      <h1 className="title">{letterMode ? '누구의 편지야?' : '누구야?'}</h1>
      <p className="subtitle">
        {letterMode
          ? '편지를 쓸 사람의 이름을 눌러줘. (그만두려면 버튼을 다시 눌러줘)'
          : '네 이름을 눌러줘.'}
      </p>

      <ul className="roster">
        {rows.map((r) => (
          <li key={r.student_id}>
            <button
              className="student"
              type="button"
              data-done={r.submitted ? '1' : '0'}
              onClick={() => (letterMode ? onLetter(r) : onPick(r))}
            >
              <span className="no">{r.student_no}번</span>
              <span>{r.student_name}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
