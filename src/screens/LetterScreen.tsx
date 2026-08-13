import { useEffect, useState } from 'react';

import { sendLetter } from '../lib/api';
import type { Notify } from '../components/Toast';
import type { SavedStudent } from '../types';

const LETTER_LIMIT = 1000;

/** 태블릿을 돌려 쓰므로 보낸 뒤에는 잠깐만 보여주고 명단으로 넘긴다. */
const AUTO_RETURN_SECONDS = 6;

interface Props {
  me: SavedStudent;
  code: string;
  /** 오늘 감정 기록을 이미 마친 학생인지. 왜 이 화면으로 왔는지 알려주려고 받는다. */
  checkedIn: boolean;
  notify: Notify;
  onBack: () => void;
  onDone: () => void;
}

/**
 * 선생님께 보내는 비밀편지.
 *
 * 익명으로 보내면 보낸 사람이 DB 에도 남지 않는다. 그래서 「익명으로 보내기」는
 * 되돌릴 수 없다는 것을 아이가 알아볼 수 있게 체크박스 옆에 그대로 적어둔다.
 */
export function LetterScreen({ me, code, checkedIn, notify, onBack, onDone }: Props) {
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentAs, setSentAs] = useState<'anon' | 'named' | null>(null);
  const [left, setLeft] = useState(AUTO_RETURN_SECONDS);

  const trimmed = body.trim();
  const over = trimmed.length > LETTER_LIMIT;

  useEffect(() => {
    if (!sentAs) return;
    const tick = setInterval(() => setLeft((n) => n - 1), 1000);
    const done = setTimeout(onDone, AUTO_RETURN_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [sentAs, onDone]);

  async function handleSend() {
    if (sending) return;
    if (!trimmed) {
      notify('편지에 하고 싶은 말을 적어줘.', 'bad');
      return;
    }
    if (over) {
      notify(`편지는 ${LETTER_LIMIT}자까지만 쓸 수 있어.`, 'bad');
      return;
    }

    setSending(true);
    try {
      await sendLetter({ code, studentId: me.id, body: trimmed, anonymous });
      setSentAs(anonymous ? 'anon' : 'named');
    } catch (err) {
      notify(err instanceof Error ? err.message : '보내지 못했어. 다시 눌러줄래?', 'bad');
      setSending(false);
    }
  }

  if (sentAs) {
    return (
      <div className="done">
        <h2>편지를 보냈어!</h2>
        <p>
          {sentAs === 'anon'
            ? '누가 썼는지는 아무도 몰라. 선생님이 잘 읽어보실 거야.'
            : `선생님이 ${me.name}의 편지를 읽어보실 거야.`}
        </p>
        <button className="btn btn-primary" type="button" onClick={onDone}>
          다음 친구 차례 {left > 0 ? `(${left})` : ''}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <span className="who">{me.label}</span>
        <span className="who">
          <strong>{me.name}</strong>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            돌아가기
          </button>
        </span>
      </div>

      <h1 className="title">선생님께 비밀편지</h1>
      <p className="subtitle">
        {checkedIn
          ? '오늘 기록은 이미 마쳤어. 그래도 하고 싶은 말이 있으면 여기에 적어줘.'
          : '선생님만 읽을 수 있어. 하고 싶은 말을 편하게 적어줘.'}
      </p>

      <div className="note-box letter-box">
        <label htmlFor="letter">
          편지 <span>— 고민, 부탁, 고마운 마음 무엇이든 좋아</span>
        </label>
        <textarea
          id="letter"
          className="letter-text"
          rows={8}
          maxLength={LETTER_LIMIT + 40}
          placeholder="선생님께 하고 싶은 말을 적어줘."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <label className="anon-check">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
          />
          <span className="anon-text">
            익명으로 보내기
            <small>이름을 남기지 않아. 선생님께는 「익명」 이라고만 보여.</small>
          </span>
        </label>

        <div className="note-foot">
          <span className="counter" data-over={over ? '1' : '0'}>
            {trimmed.length} / {LETTER_LIMIT}
          </span>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!trimmed || over || sending}
            onClick={handleSend}
          >
            {sending ? '보내는 중…' : '선생님께 보내기'}
          </button>
        </div>
      </div>
    </>
  );
}
