import { useEffect, useState } from 'react';

import { Toast, useToast } from './components/Toast';
import { CodeScreen } from './screens/CodeScreen';
import { DoneScreen } from './screens/DoneScreen';
import { EmotionScreen } from './screens/EmotionScreen';
import { RosterScreen } from './screens/RosterScreen';
import { fetchEmotions, fetchRoster } from './lib/api';
import { asset } from './lib/assets';
import { savedCode, savedStudent } from './lib/storage';
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

  // 앱을 열 때: 감정 목록을 받고, 기억해둔 코드·이름으로 갈 수 있는 데까지 건너뛴다.
  useEffect(() => {
    let alive = true;

    void (async () => {
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

      const me = savedStudent.get();
      const mine = me ? rows.find((r) => r.student_id === me.id) : undefined;

      if (!mine) {
        setScreen({ kind: 'roster', rows });
        return;
      }

      savedStudent.set(toSaved(mine));
      setScreen(
        mine.submitted
          ? { kind: 'done', result: { kind: 'revisited', name: mine.student_name } }
          : { kind: 'emotion', me: toSaved(mine) },
      );
    })();

    return () => {
      alive = false;
    };
  }, [notify]);

  function handleRosterPick(entry: RosterEntry) {
    const me = toSaved(entry);
    savedStudent.set(me);

    if (entry.submitted) {
      setScreen({ kind: 'done', result: { kind: 'revisited', name: me.name } });
      return;
    }
    setScreen({ kind: 'emotion', me });
  }

  async function handleNotMe() {
    savedStudent.clear();
    try {
      setScreen({ kind: 'roster', rows: await fetchRoster(code) });
    } catch {
      notify('명단을 못 불러왔어. 잠시 뒤에 다시 해줄래?', 'bad');
    }
  }

  function handleChangeClass() {
    savedCode.clear();
    savedStudent.clear();
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
              onNotMe={() => void handleNotMe()}
              onDone={(result) => setScreen({ kind: 'done', result })}
            />
          )}

          {screen.kind === 'done' && <DoneScreen result={screen.result} />}
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
