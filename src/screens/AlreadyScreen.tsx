import type { SavedStudent } from '../types';

interface Props {
  me: SavedStudent;
  onLetter: () => void;
  onBack: () => void;
}

/**
 * 오늘 기록을 이미 마친 학생이 명단에서 자기 이름을 눌렀을 때.
 *
 * 예전에는 「이미 기록했어」 알림만 띄우고 명단에 그대로 뒀는데, 그러면 편지를
 * 보내고 싶은 아이가 그 자리에서 막힌다. 여기서 편지로 가는 길을 내준다.
 *
 * 자동으로 명단에 돌아가지 않는다 — 편지를 쓸지 말지 고르는 동안 화면이
 * 넘어가 버리면 안 된다. 다음 학생은 「명단으로 돌아가기」를 누르면 된다.
 */
export function AlreadyScreen({ me, onLetter, onBack }: Props) {
  return (
    <div className="done">
      <h2>{me.name}, 오늘은 이미 기록했어!</h2>
      <p>기록은 하루에 한 번이야. 그래도 선생님께 하고 싶은 말이 있으면 편지를 보낼 수 있어.</p>

      <button className="btn btn-primary" type="button" onClick={onLetter}>
        💌 선생님께 비밀편지
      </button>
      <button className="btn btn-ghost" type="button" onClick={onBack}>
        명단으로 돌아가기
      </button>
    </div>
  );
}
