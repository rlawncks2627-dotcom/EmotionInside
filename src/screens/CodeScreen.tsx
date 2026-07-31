import { useState, type FormEvent } from 'react';

import { fetchRoster } from '../lib/api';
import type { Notify } from '../components/Toast';
import type { RosterEntry } from '../types';

/** 학교약칭(2) + 학년(1) + 반(2). 예: 2학년 1반 = YS201 */
const CODE_LENGTH = 5;

interface Props {
  onFound: (code: string, rows: RosterEntry[]) => void;
  notify: Notify;
}

/** 학급코드 입력. 기기에 한 번만 넣으면 다시 묻지 않는다. */
export function CodeScreen({ onFound, notify }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== CODE_LENGTH) {
      notify(`코드는 ${CODE_LENGTH}글자야. 다시 확인해줄래?`, 'bad');
      return;
    }

    setBusy(true);
    try {
      const rows = await fetchRoster(clean);
      if (rows.length === 0) {
        notify('그런 반이 없어. 코드를 다시 볼래?', 'bad');
        return;
      }
      onFound(clean, rows);
    } catch (err) {
      notify(err instanceof Error ? err.message : '연결이 안 돼. 잠시 뒤에 다시 해줄래?', 'bad');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>우리 반 코드를 넣어줘</h2>
      <p>선생님이 알려주신 {CODE_LENGTH}글자를 입력하면 돼.</p>
      <form onSubmit={handleSubmit}>
        <input
          className="code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={CODE_LENGTH}
          placeholder="YS201"
          aria-label="학급 코드"
        />
        <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={busy}>
          {busy ? '확인하는 중…' : '확인'}
        </button>
      </form>
    </div>
  );
}
