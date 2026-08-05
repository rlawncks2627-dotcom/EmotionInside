/* 주간 컨디션 리포트를 PDF 파일로 만든다.
   `teacher.html` 이 데이터를 모아 downloadWeekReport() 를 부르면 나머지는 여기서 한다.

   왜 캔버스에 그려서 그림으로 넣는가:
   PDF 안에 한글을 글자로 넣으려면 글꼴을 통째로 심어야 해서 파일이 수 MB 로 불어난다.
   대신 브라우저가 이미 불러온 Pretendard 로 캔버스에 그린 뒤 그 그림을 얹으면,
   글꼴을 한 바이트도 심지 않고도 한글이 제대로 나온다. 외부 라이브러리도 필요 없어서
   교내망에서 CDN 이 막혀도 동작한다.
   맞바꾼 것: PDF 안의 글자는 그림이라 복사·검색이 되지 않는다. */

// ── 차트 좌표계 (화면 SVG 와 리포트 캔버스가 함께 쓴다) ──────────

export const LEVELS = [
  [5, '아주 좋음'], [4, '좋음'], [3, '보통'], [2, '힘듦'], [1, '많이 힘듦'],
];

export const KOR_DOW = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 컨디션 차트의 좌표 계산. 화면과 리포트가 같은 함수를 써야 둘이 따로 놀지 않는다.
 * pad 는 눈금·요일 글자가 앉을 자리다.
 */
export function chartGeometry({ width, height, pad, count }) {
  const pw = width - pad.l - pad.r;
  const ph = height - pad.t - pad.b;
  const last = count - 1;
  return {
    W: width, H: height, L: pad.l, R: pad.r, T: pad.t, B: pad.b, pw, ph, last,
    x: (i) => pad.l + (pw / last) * i,
    y: (s) => pad.t + ((5 - s) / 4) * ph,
    /** 주말 칸을 칠할 사각형. 양 끝이 도면 밖으로 새지 않게 잘라준다. */
    band(i) {
      const half = pw / last / 2;
      const x0 = Math.max(pad.l + (pw / last) * i - half, pad.l - 6);
      const x1 = Math.min(pad.l + (pw / last) * i + half, width - pad.r + 6);
      return { x: x0, w: x1 - x0, y: pad.t - 6, h: ph + 12 };
    },
  };
}

/** 월요일부터 이레치를 만든다. 기록이 없는 날도 자리를 남긴다. */
export function buildWeek(monday, rows, emotions) {
  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const byDate = new Map((rows ?? []).map((r) => [r.checkin_date, r]));

  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const row = byDate.get(ymd(d)) ?? null;
    return {
      date: d,
      row,
      emo: row ? emotions.get(row.emotion_code) : null,
      weekend: i >= 5,
    };
  });
}

/** 점수를 매긴 날만 골라낸다. 컨디션 기능이 생기기 전 기록은 점수가 없다. */
export function scoredPoints(days) {
  const pts = [];
  days.forEach((d, i) => {
    const s = d.row?.condition_score;
    if (s != null) pts.push({ i, s, e: d.emo });
  });
  return pts;
}

/** 차트 위에 얹을 요약 한 줄. 차트를 뜯어보기 전에 눈으로 먼저 읽히는 문장이다. */
export function weekSummary(days) {
  const kept = days.filter((d) => d.row);
  if (!kept.length) return '이 주에는 기록이 없습니다.';

  const parts = [`${kept.length}일 기록`];

  const scores = kept.map((d) => d.row.condition_score).filter((s) => s != null);
  if (scores.length) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    parts.push(`평균 컨디션 ${avg.toFixed(1)}`);
  }

  // 가장 많이 고른 감정. 같은 수면 그 주에 먼저 나온 쪽을 쓴다.
  // 다 한 번씩이면 「가장 많이」가 아니므로 아예 넣지 않는다 — 없는 경향을 만들어내면 안 된다.
  const tally = new Map();
  for (const d of kept) {
    if (!d.emo) continue;
    tally.set(d.emo.label, (tally.get(d.emo.label) ?? 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] > 1) parts.push(`가장 많이 고른 감정: ${top[0]}`);

  const noScore = kept.length - scores.length;
  if (noScore) parts.push(`컨디션 없는 기록 ${noScore}일`);

  return parts.join(' · ');
}

// ── 종이 ────────────────────────────────────────────────────────
// A4 세로를 150dpi 로 그린다. 인쇄해도 글자가 깨지지 않고, 파일도 지나치게 크지 않다.

const PAGE = { w: 1240, h: 1754, margin: 96 };
const PT = { w: 595.28, h: 841.89 };   // A4 를 포인트로

const INK = '#241a3d';
const SOFT = '#6b6288';
const LINE = '#e4e0ee';
const PANEL = '#faf9fd';
const ACCENT = '#7c6ac4';
const FAINT = '#a49cc0';

const font = (weight, size) => `${weight} ${size}px Pretendard, sans-serif`;
const fmtKo = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;

/** 캔버스가 Pretendard 로 그리려면 그 굵기가 실제로 올라와 있어야 한다. */
async function ensureFonts() {
  if (!document.fonts) return;
  await Promise.all(
    [400, 600, 700, 800].map((w) => document.fonts.load(`${w} 32px Pretendard`)),
  );
  await document.fonts.ready;
}

function newPage() {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE.w;
  canvas.height = PAGE.h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, PAGE.w, PAGE.h);
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * 글줄 나누기. 한글은 어절 사이에서 끊고, 한 어절이 통째로 너무 길면 글자로 자른다.
 * 학생이 줄바꿈을 넣은 한마디도 있어서 먼저 줄바꿈으로 쪼갠다.
 */
function wrapText(ctx, text, maxWidth) {
  const out = [];

  for (const paragraph of String(text).split('\n')) {
    let line = '';

    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);

      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        continue;
      }
      // 띄어쓰기 없이 길게 이어 쓴 경우
      let chunk = '';
      for (const ch of word) {
        if (ctx.measureText(chunk + ch).width > maxWidth) {
          out.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    }

    out.push(line);
  }

  return out;
}

// ── 그리기 ──────────────────────────────────────────────────────

function drawChart(ctx, days, box) {
  roundRect(ctx, box.x, box.y, box.w, box.h, 24);
  ctx.fillStyle = PANEL;
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  const inset = 28;
  const g = chartGeometry({
    width: box.w - inset * 2,
    height: box.h - inset * 2,
    // 아래 여백은 요일·날짜 두 줄이 앉을 자리 + 컨디션 1점 동그라미가 닿지 않을 만큼
    pad: { l: 172, r: 40, t: 30, b: 92 },
    count: days.length,
  });

  const ox = box.x + inset;
  const oy = box.y + inset;
  const X = (i) => ox + g.x(i);
  const Y = (s) => oy + g.y(s);

  // 주말 칸을 옅게 깔아 수업일과 구분한다
  ctx.fillStyle = '#f2effa';
  for (let i = 0; i < days.length; i++) {
    if (!days[i].weekend) continue;
    const b = g.band(i);
    ctx.fillRect(ox + b.x, oy + b.y, b.w, b.h);
  }

  ctx.textAlign = 'right';
  for (const [s, label] of LEVELS) {
    ctx.strokeStyle = s === 3 ? '#c9c2e0' : '#e6e2f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + g.L, Y(s));
    ctx.lineTo(ox + g.W - g.R, Y(s));
    ctx.stroke();

    ctx.fillStyle = '#8a82a8';
    ctx.font = font(700, 24);
    ctx.fillText(`${s} ${label}`, ox + g.L - 18, Y(s) + 8);
  }

  ctx.textAlign = 'center';
  for (let i = 0; i < days.length; i++) {
    ctx.fillStyle = days[i].weekend ? FAINT : '#5b5378';
    ctx.font = font(800, 26);
    ctx.fillText(KOR_DOW[i], X(i), oy + g.H - 34);

    ctx.fillStyle = FAINT;
    ctx.font = font(600, 20);
    ctx.fillText(String(days[i].date.getDate()), X(i), oy + g.H - 6);
  }

  const pts = scoredPoints(days);

  // 이어지는 날은 실선, 중간이 비면 점선. 안 낸 날을 그은 선으로 채우지 않는다.
  ctx.lineCap = 'round';
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k];
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 6;
    ctx.globalAlpha = b.i - a.i > 1 ? 0.55 : 1;
    ctx.setLineDash(b.i - a.i > 1 ? [11, 11] : []);
    ctx.beginPath();
    ctx.moveTo(X(a.i), Y(a.s));
    ctx.lineTo(X(b.i), Y(b.s));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(X(p.i), Y(p.s), 20, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = p.e?.color ?? ACCENT;
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  // 기록이 아예 없는 주는 바로 위 요약줄이 이미 그렇게 말하고 있다. 두 번 쓰지 않는다.
  // 기록은 냈는데 컨디션만 없는 경우는 따로 알려줘야 빈 차트가 오해되지 않는다.
  if (!pts.length && days.some((d) => d.row)) {
    ctx.fillStyle = FAINT;
    ctx.font = font(700, 28);
    ctx.fillText('기록은 있지만 컨디션 점수가 없습니다', ox + g.L + g.pw / 2, oy + g.T + g.ph / 2);
  }

  ctx.textAlign = 'left';
}

function drawHeader(ctx, { classLabel, student, weekLabel, continued }) {
  const m = PAGE.margin;

  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = font(800, 42);
  const who = `${student.name}`;
  ctx.fillText(who, m, 132);

  const nameWidth = ctx.measureText(who).width;
  ctx.fillStyle = SOFT;
  ctx.font = font(700, 26);
  ctx.fillText(`${student.no}번 · ${classLabel}`, m + nameWidth + 18, 132);

  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = font(700, 28);
  ctx.fillText(continued ? `${weekLabel} (이어서)` : weekLabel, PAGE.w - m, 132);
  ctx.textAlign = 'left';

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m, 164);
  ctx.lineTo(PAGE.w - m, 164);
  ctx.stroke();
}

/* 쪽 번호만 찍고 전체 장수는 넣지 않는다. 전체를 찍으려면 모든 쪽을 다 그린 뒤에야
   발 부분을 채울 수 있어서, 25명치 캔버스를 한꺼번에 들고 있어야 한다(200MB 가 넘는다).
   전체 장수는 PDF 뷰어가 알아서 보여준다. */
function drawFooter(ctx, page, madeOn) {
  ctx.textAlign = 'center';
  ctx.fillStyle = FAINT;
  ctx.font = font(600, 20);
  ctx.fillText(`EmotionInside · ${madeOn} 만듦 · ${page}쪽`, PAGE.w / 2, PAGE.h - 56);
  ctx.textAlign = 'left';
}

/**
 * 학생 한 명의 한 주를 그린다. 한마디가 많아 한 장을 넘기면 다음 장으로 이어진다.
 * 페이지 번호는 전체 장수를 알아야 찍을 수 있어서 여기서는 비워 두고 나중에 넣는다.
 */
function drawStudent({ classLabel, student, days, weekLabel }) {
  const m = PAGE.margin;
  const textWidth = PAGE.w - m * 2;
  const bottom = PAGE.h - 130;

  const pages = [];
  let { canvas, ctx } = newPage();
  pages.push(canvas);

  drawHeader(ctx, { classLabel, student, weekLabel, continued: false });

  ctx.fillStyle = SOFT;
  ctx.font = font(700, 26);
  ctx.fillText(weekSummary(days), m, 214);

  drawChart(ctx, days, { x: m, y: 254, w: textWidth, h: 440 });

  const withNote = days.filter((d) => d.row?.note);

  ctx.fillStyle = INK;
  ctx.font = font(800, 30);
  ctx.fillText('그 주에 남긴 한마디', m, 764);

  let y = 812;

  if (!withNote.length) {
    ctx.fillStyle = FAINT;
    ctx.font = font(600, 26);
    ctx.fillText('이 주에 남긴 한마디가 없습니다.', m, y);
    return pages;
  }

  for (const d of withNote) {
    ctx.font = font(600, 26);
    const body = wrapText(ctx, d.row.note, textWidth - 44);
    const blockHeight = 40 + body.length * 40 + 26;

    // 이 한마디가 남은 자리에 안 들어가면 새 장으로 넘긴다
    if (y + blockHeight > bottom) {
      ({ canvas, ctx } = newPage());
      pages.push(canvas);
      drawHeader(ctx, { classLabel, student, weekLabel, continued: true });
      y = 240;
    }

    const score = d.row.condition_score != null ? ` · 컨디션 ${d.row.condition_score}` : '';

    ctx.fillStyle = d.emo?.color ?? '#ccc';
    ctx.fillRect(m, y - 28, 7, blockHeight - 20);

    ctx.fillStyle = SOFT;
    ctx.font = font(700, 22);
    ctx.fillText(`${fmtKo(d.date)} · ${d.emo?.label ?? ''}${score}`, m + 26, y - 6);

    ctx.fillStyle = INK;
    ctx.font = font(600, 26);
    let ty = y + 34;
    for (const row of body) {
      ctx.fillText(row, m + 26, ty);
      ty += 40;
    }

    y += blockHeight;
  }

  return pages;
}

// ── PDF 껍데기 ──────────────────────────────────────────────────

/** 캔버스를 JPEG 바이트로. 흰 바탕이 대부분이라 품질을 조금 낮춰도 티가 안 난다. */
function toJpeg(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))),
      'image/jpeg',
      0.88,
    );
  });
}

/**
 * JPEG 한 장을 한 쪽에 얹은 PDF 를 손으로 쓴다.
 * 글자를 넣지 않으므로 글꼴 사전이 필요 없고, 구조가 단순해서 라이브러리가 필요 없다.
 */
function buildPdf(images) {
  const enc = new TextEncoder();
  const chunks = [];
  let length = 0;

  const put = (data) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };

  // 객체 번호 1=카탈로그, 2=쪽 목록, 그 뒤로 쪽마다 3개씩
  const offsets = [];
  const objectAt = (n, body) => {
    offsets[n] = length;
    put(`${n} 0 obj\n`);
    put(body);
    put('\nendobj\n');
  };

  const pageObj = (i) => 3 + i * 3;
  const total = images.length;

  put('%PDF-1.4\n');

  objectAt(1, '<</Type/Catalog/Pages 2 0 R>>');

  const kids = images.map((_, i) => `${pageObj(i)} 0 R`).join(' ');
  objectAt(2, `<</Type/Pages/Kids[${kids}]/Count ${total}>>`);

  images.forEach((img, i) => {
    const page = pageObj(i);
    const contents = page + 1;
    const image = page + 2;

    objectAt(
      page,
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PT.w} ${PT.h}]` +
        `/Resources<</XObject<</Im0 ${image} 0 R>>>>/Contents ${contents} 0 R>>`,
    );

    // 그림을 쪽 크기에 딱 맞춰 놓는다
    const stream = `q\n${PT.w} 0 0 ${PT.h} 0 0 cm\n/Im0 Do\nQ\n`;
    objectAt(contents, `<</Length ${enc.encode(stream).length}>>\nstream\n${stream}endstream`);

    offsets[image] = length;
    put(`${image} 0 obj\n`);
    put(
      `<</Type/XObject/Subtype/Image/Width ${img.w}/Height ${img.h}` +
        `/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${img.bytes.length}>>\nstream\n`,
    );
    put(img.bytes);
    put('\nendstream\nendobj\n');
  });

  const size = 3 + total * 3;
  const xref = length;

  // 각 줄은 정확히 20바이트여야 한다
  let table = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n < size; n++) {
    table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  }
  put(table);
  put(`trailer\n<</Size ${size}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

// ── 바깥에서 부르는 것 ──────────────────────────────────────────

/**
 * 주간 리포트를 PDF 로 내려받는다.
 *
 * @param {object}   args
 * @param {string}   args.fileName   확장자까지 붙인 파일 이름
 * @param {string}   args.classLabel 「2학년 1반」처럼 쪽머리에 들어갈 학급 이름
 * @param {string}   args.weekLabel  「7월 27일 ~ 8월 2일」
 * @param {Array}    args.entries    [{ student: {no, name}, days }] — 명단 순서대로
 * @returns {Promise<number>} 만들어진 쪽 수
 */
export async function downloadWeekReport({ fileName, classLabel, weekLabel, entries }) {
  await ensureFonts();

  const madeOn = new Date().toLocaleDateString('ko-KR');
  const images = [];

  // 학생 한 명씩 그리고 바로 JPEG 로 굳힌 뒤 캔버스를 놓아준다.
  // 25명치를 한꺼번에 들고 있으면 태블릿에서 메모리가 모자란다.
  for (const entry of entries) {
    for (const canvas of drawStudent({ classLabel, weekLabel, ...entry })) {
      drawFooter(canvas.getContext('2d'), images.length + 1, madeOn);
      images.push({ bytes: await toJpeg(canvas), w: canvas.width, h: canvas.height });
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  const blob = new Blob([buildPdf(images)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  // 바로 거둬들이면 내려받기가 시작되기 전에 주소가 사라지는 기기가 있다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return images.length;
}
