import { useState } from 'react';

import { ApiError, submitCheckin } from '../lib/api';
import { characterTile } from '../lib/assets';
import { CONDITION_LEVELS, NOTE_HINTS, pick } from '../data/messages';
import type { Notify } from '../components/Toast';
import type { DoneResult, Emotion, SavedStudent } from '../types';

const NOTE_LIMIT = 200;

interface Props {
  me: SavedStudent;
  code: string;
  emotions: Emotion[];
  onDone: (result: DoneResult) => void;
  onNotMe: () => void;
  notify: Notify;
}

export function EmotionScreen({ me, code, emotions, onDone, onNotMe, notify }: Props) {
  const [picked, setPicked] = useState<Emotion | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  // 화면에 들어올 때 한 번만 고른다. 글자를 칠 때마다 문구가 바뀌면 정신없다.
  const [hint] = useState(() => pick(NOTE_HINTS));

  const trimmed = note.trim();
  const over = trimmed.length > NOTE_LIMIT;

  async function handleSubmit() {
    if (!picked || score === null || sending) return;
    if (over) {
      notify(`한마디는 ${NOTE_LIMIT}자까지만 쓸 수 있어.`, 'bad');
      return;
    }

    setSending(true);
    try {
      await submitCheckin({ code, studentId: me.id, emotion: picked.code, note, score });
      onDone({ kind: 'submitted', emotion: picked, note: trimmed });
    } catch (err) {
      // 하루 한 번 제한에 걸렸다면 완료 화면으로 보내주는 편이 덜 당황스럽다.
      if (err instanceof ApiError && err.isDuplicate) {
        onDone({ kind: 'revisited', name: me.name });
        return;
      }
      notify(err instanceof Error ? err.message : '보내지 못했어. 다시 눌러줄래?', 'bad');
      setSending(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="who">{me.label}</span>
        <span className="who">
          <strong>{me.name}</strong>
          <button className="btn btn-ghost" type="button" onClick={onNotMe}>
            내가 아냐
          </button>
        </span>
      </div>

      <h1 className="title">{me.name}, 오늘 기분 어때?</h1>
      <p className="subtitle">마음에 가장 가까운 친구를 한 명 골라줘.</p>

      <div className="emotion-layout">
        <ul className="emotions" data-picked={picked ? picked.code : undefined}>
          {emotions.map((e) => (
            <li key={e.code}>
              <button
                className="emotion"
                type="button"
                aria-pressed={picked?.code === e.code}
                style={{ ['--pick' as string]: e.color }}
                onClick={() => setPicked(e)}
              >
                <img src={characterTile(e.code)} alt={e.label} width={512} height={512} />
                <span className="name">{e.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="note-box" style={picked ? { ['--pick' as string]: picked.color } : undefined}>
          <label htmlFor="score">
            오늘 컨디션 <span>— 몸과 마음 상태를 골라줘</span>
          </label>
          <select
            id="score"
            className="score-select"
            value={score ?? ''}
            onChange={(e) => setScore(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">골라줘</option>
            {CONDITION_LEVELS.map((c) => (
              <option key={c.score} value={c.score}>
                {c.score}점 · {c.label}
              </option>
            ))}
          </select>

          <label htmlFor="note">
            한마디 <span>— 쓰고 싶을 때만 써도 돼</span>
          </label>
          <textarea
            id="note"
            rows={3}
            maxLength={NOTE_LIMIT + 20}
            placeholder={hint}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="note-foot">
            <span className="counter" data-over={over ? '1' : '0'}>
              {trimmed.length} / {NOTE_LIMIT}
            </span>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!picked || score === null || sending}
              onClick={handleSubmit}
            >
              {sending ? '보내는 중…' : '다 골랐어'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
