/**
 * public/ 안의 파일 주소를 만든다.
 *
 * `/assets/...` 처럼 절대경로로 쓰면 GitHub Pages 처럼 하위 경로로 배포했을 때 깨진다.
 * BASE_URL 을 앞에 붙이면 배포 위치가 어디든 올바르게 풀린다.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

/** 감정 코드에 해당하는 캐릭터 타일. size 는 512(기본) 또는 256. */
export function characterTile(code: string, size: 256 | 512 = 512): string {
  const suffix = size === 256 ? '@256' : '';
  return asset(`assets/characters/tile/${code}${suffix}.webp`);
}
