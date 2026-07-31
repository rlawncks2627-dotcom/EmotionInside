import { useEffect, useState } from 'react';

import { characterTile } from '../lib/assets';
import { closingFor } from '../data/messages';
import type { DoneResult } from '../types';

/** 태블릿을 돌려 쓰므로 잠깐 보여준 뒤 다음 학생에게 넘긴다. */
const AUTO_RETURN_SECONDS = 6;

interface Props {
  result: DoneResult;
  onNext: () => void;
}

export function DoneScreen({ result, onNext }: Props) {
  const [left, setLeft] = useState(AUTO_RETURN_SECONDS);

  useEffect(() => {
    const tick = setInterval(() => setLeft((n) => n - 1), 1000);
    const done = setTimeout(onNext, AUTO_RETURN_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [onNext]);

  const next = (
    <button className="btn btn-primary" type="button" onClick={onNext}>
      다음 친구 차례 {left > 0 ? `(${left})` : ''}
    </button>
  );

  if (result.kind === 'revisited') {
    return (
      <div className="done">
        <h2>{result.name}, 오늘은 이미 기록했어!</h2>
        <p>기록은 하루에 한 번이야. 내일 또 만나자!</p>
        {next}
      </div>
    );
  }

  const { emotion, note } = result;

  return (
    <div className="done">
      <img className="pick-img" src={characterTile(emotion.code)} alt={emotion.label} />
      <h2>{closingFor(emotion.bucket)}</h2>
      <p>오늘의 나는 {emotion.label}.</p>
      {note && <div className="said">“{note}”</div>}
      {next}
    </div>
  );
}
