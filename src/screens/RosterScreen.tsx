import type { RosterEntry } from '../types';

interface Props {
  rows: RosterEntry[];
  onPick: (entry: RosterEntry) => void;
  onChangeClass: () => void;
}

/** 이름 고르기. 이미 낸 사람은 표시되지만 감정 내용은 보이지 않는다. */
export function RosterScreen({ rows, onPick, onChangeClass }: Props) {
  const classLabel = rows[0]?.class_label ?? '';

  return (
    <>
      <div className="topbar">
        <span>{classLabel}</span>
        <button className="btn btn-ghost" type="button" onClick={onChangeClass}>
          반 바꾸기
        </button>
      </div>

      <h1 className="title">누구야?</h1>
      <p className="subtitle">네 이름을 눌러줘.</p>

      <ul className="roster">
        {rows.map((r) => (
          <li key={r.student_id}>
            <button
              className="student"
              type="button"
              data-done={r.submitted ? '1' : '0'}
              onClick={() => onPick(r)}
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
