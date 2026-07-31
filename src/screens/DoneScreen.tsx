import { characterTile } from '../lib/assets';
import { closingFor } from '../data/messages';
import type { DoneResult } from '../types';

/** 개인 기기라 자동으로 되돌아가지 않고 그대로 머문다. */
export function DoneScreen({ result }: { result: DoneResult }) {
  if (result.kind === 'revisited') {
    return (
      <div className="done">
        <h2>{result.name}, 오늘은 이미 기록했어!</h2>
        <p>기록은 하루에 한 번이야. 내일 또 만나자!</p>
      </div>
    );
  }

  const { emotion, note } = result;

  return (
    <div className="done">
      <img className="pick-img" src={characterTile(emotion.code)} alt={emotion.label} />
      <h2>{closingFor(emotion.valence)}</h2>
      <p>오늘의 나는 {emotion.label}.</p>
      {note && <div className="said">“{note}”</div>}
    </div>
  );
}
