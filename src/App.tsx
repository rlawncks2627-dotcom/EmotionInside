import { useCallback, useEffect, useState } from 'react';

import { Toast, useToast } from './components/Toast';
import { CodeScreen } from './screens/CodeScreen';
import { DoneScreen } from './screens/DoneScreen';
import { EmotionScreen } from './screens/EmotionScreen';
import { RosterScreen } from './screens/RosterScreen';
import { fetchEmotions, fetchRoster } from './lib/api';
import { asset } from './lib/assets';
import { forgetLegacyStudent, savedCode } from './lib/storage';
import type { DoneResult, Emotion, RosterEntry, SavedStudent } from './types';

import './styles/student.css';

type Screen =
  | { kind: 'loading' }
  | { kind: 'code' }
  | { kind: 'roster'; rows: RosterEntry[] }
  | { kind: 'emotion'; me: SavedStudent }
  | { kind: 'done'; result: DoneResult };

const toSaved = (r: RosterEntry): SavedStudent => ({
  id: r.student_id,
  name: r.student_name,
  label: r.class_label,
});

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [code, setCode] = useState('');
  const { notify, toast } = useToast();

  /**
   * 명단으로 돌아간다. 태블릿 한 대를 줄 서서 쓰기 때문에
   * 한 명이 끝나면 반드시 명단이 다시 떠야 다음 학생이 이어서 쓸 수 있다.
   * 제출 표시를 갱신해야 하므로 그때마다 새로 읽는다.
   */
  const backToRoster = useCallback(
    async (forCode?: string) => {
      const target = forCode ?? code;
      if (!target) {
        setScreen({ kind: 'code' });
        return;
      }
      try {
        const rows = await fetchRoster(target);
        if (rows.length === 0) {
          savedCode.clear();
          setScreen({ kind: 'code' });
          return;
        }
        setScreen({ kind: 'roster', rows });
      } catch {
        notify('명단을 못 불러왔어. 잠시 뒤에 다시 해줄래?', 'bad');
      }
    },
    [code, notify],
  );

  useEffect(() => {
    let alive = true;

    void (async () => {
      // 예전 판이 남긴 학생 정보를 지운다. 그대로 두면 앞사람 화면이 다시 뜬다.
      forgetLegacyStudent();

      try {
        const list = await fetchEmotions();
        if (!alive) return;
        setEmotions(list);
      } catch {
        if (!alive) return;
        notify('감정 목록을 못 불러왔어. 인터넷을 확인해줄래?', 'bad');
        setScreen({ kind: 'code' });
        return;
      }

      const stored = savedCode.get();
      if (!stored) {
        setScreen({ kind: 'code' });
        return;
      }

      let rows: RosterEntry[];
      try {
        rows = await fetchRoster(stored);
      } catch {
        if (alive) setScreen({ kind: 'code' });
        return;
      }
      if (!alive) return;

      if (rows.length === 0) {
        savedCode.clear();
        setScreen({ kind: 'code' });
        return;
      }

      setCode(stored);
      // 누가 쓸지 모르니 언제나 명단부터 보여준다.
      setScreen({ kind: 'roster', rows });
    })();

    return () => {
      alive = false;
    };
  }, [notify]);

  function handleRosterPick(entry: RosterEntry) {
    if (entry.submitted) {
      notify(`${entry.student_name}, 오늘은 이미 기록했어!`);
      return;
    }
    setScreen({ kind: 'emotion', me: toSaved(entry) });
  }

  function handleChangeClass() {
    savedCode.clear();
    setCode('');
    setScreen({ kind: 'code' });
  }

  return (
    <>
      <div
        className="bg"
        aria-hidden="true"
        style={{ backgroundImage: `url(${asset('assets/bg/student.jpg')})` }}
      />

      {screen.kind === 'loading' ? (
        <div className="loading">
          <div className="spinner" role="status" aria-label="불러오는 중" />
        </div>
      ) : (
        <div className="wrap">
          {screen.kind === 'code' && (
            <CodeScreen
              notify={notify}
              onFound={(found, rows) => {
                savedCode.set(found);
                setCode(found);
                setScreen({ kind: 'roster', rows });
              }}
            />
          )}

          {screen.kind === 'roster' && (
            <RosterScreen
              rows={screen.rows}
              onPick={handleRosterPick}
              onChangeClass={handleChangeClass}
            />
          )}

          {screen.kind === 'emotion' && (
            <EmotionScreen
              me={screen.me}
              code={code}
              emotions={emotions}
              notify={notify}
              onNotMe={() => void backToRoster()}
              onDone={(result) => setScreen({ kind: 'done', result })}
            />
          )}

          {screen.kind === 'done' && (
            <DoneScreen result={screen.result} onNext={() => void backToRoster()} />
          )}
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
