import type { ReactNode } from 'react';
import { useGame } from './useGame';
import { ACC, EXPR, MOUTHS, POSES } from '../game/character';
import { TIMES } from '../game/lighting';
import { FRAMES, SUB_STYLES } from '../game/modes';
import { QUALITY } from '../game/quality';
import { Warehouse } from './Warehouse';

const SIZE_MIN = 0.4, SIZE_MAX = 2.5, SIZE_STEP = 0.1;

function Choices<T>({ items, isOn, onPick, label }: { items: readonly T[]; isOn: (it: T, i: number) => boolean; onPick: (it: T, i: number) => void; label: (it: T, i: number) => string }) {
  return (
    <div className="row">
      {items.map((it, i) => (
        <button key={i} type="button" aria-pressed={isOn(it, i)} onClick={() => onPick(it, i)}>{label(it, i)}</button>
      ))}
    </div>
  );
}
const K = ({ children }: { children: ReactNode }) => <kbd>{children}</kbd>;

/** The character-sheet style control panel next to the game. */
export function Panel() {
  const G = useGame();
  if (!G) return <aside className="panel" />;
  const { S, ui } = G;
  const walking = !S.photo && !S.reels && !S.editMode;

  return (
    <aside className="panel">
      <div>
        <h1>souka 출근길</h1>
        <p className="sub">PROTOTYPE 0.9 · 집 → 골목 → 편의점<br />A QUIET WALK TO WORK</p>
      </div>

      {walking && (
        <section className="box">
          <span className="mode">WALK</span>
          <dl className="keys">
            <dt><K>WASD</K> <K>←↑↓→</K></dt><dd>걷기 · 운전</dd>
            <dt><K>Shift</K></dt><dd>달리기</dd>
            <dt><K>Q</K> <K>E</K> · 드래그</dt><dd>카메라 회전 · 높이</dd>
            <dt>휠</dt><dd>카메라 거리</dd>
            <dt><K>C</K></dt><dd>앉기 · 눕기 · 문 · 들기 · 차/자전거 타기</dd>
            <dt><K>L</K></dt><dd>라이트 켜기 / 끄기 (탑승 중)</dd>
            <dt><K>Z</K> <K>X</K></dt><dd>들고 있는 물건 놓을 거리</dd>
            <dt><K>P</K> <K>R</K> <K>B</K></dt><dd>사진 · 릴스 녹화 · 편집 모드 (창고)</dd>
          </dl>
          <div className="row">
            <button className="primary" onClick={() => G.togglePhoto()}>사진 모드 (P)</button>
            <button onClick={() => G.toggleReels()}>릴스 모드 (R)</button>
            <button onClick={() => G.edit.toggle()}>편집·창고 (B)</button>
          </div>
          {G.city?.enabled && (
            <div className="row">
              {S.area === 'city' && S.zone === 'alley'
                ? <button onClick={() => G.city.go('alley')}>골목으로 돌아가기</button>
                : <button onClick={() => G.city.go('city')}>타케시바로 바로 가기</button>}
            </div>
          )}
        </section>
      )}

      {S.photo && (
        <section className="box">
          <span className="mode">PHOTO</span>
          <dl className="keys">
            <dt>드래그 · 휠</dt><dd>각도 · 거리 (바닥에서 올려다보기까지)</dd>
            <dt><K>WASD</K> <K>R</K></dt><dd>카메라 시점 이동 · 위로</dd>
            <dt><K>1</K>–<K>6</K> <K>F</K> <K>T</K></dt><dd>표정 · 포즈 · 시간대</dd>
            <dt><K>G</K> <K>Space</K></dt><dd>자막 가이드 · 찍기</dd>
          </dl>
          <h2>구도</h2>
          <Choices items={FRAMES} isOn={(f) => S.frame === f.key} onPick={(f) => G.setFrame(f.key)} label={(f) => f.label} />
          <h2>표정</h2>
          <Choices items={EXPR} isOn={(e) => S.expr === e.key} onPick={(e) => G.setExpr(e.key)} label={(e, i) => `${i + 1} ${e.label}`} />
          <h2>입 모양</h2>
          <Choices items={MOUTHS} isOn={(m) => S.mouth === m.key} onPick={(m) => G.setMouth(m.key)} label={(m) => m.label} />
          <h2>포즈</h2>
          <Choices items={POSES} isOn={(p) => S.pose === p.key} onPick={(p) => G.setPose(p.key)} label={(p) => p.label} />
          <h2>시간대</h2>
          <Choices items={TIMES} isOn={(_, i) => S.timeIdx === i} onPick={(_, i) => G.applyTime(i)} label={(t) => t.name} />
          <div className="row">
            <button aria-pressed={S.guide} onClick={() => G.toggleGuide()}>자막 가이드 (G)</button>
            <button className="primary" onClick={() => G.shoot()}>찍기 (Space)</button>
            <button onClick={() => G.togglePhoto()}>나가기 (P)</button>
          </div>
        </section>
      )}

      {S.editMode && (
        <section className="box">
          <span className="mode">EDIT</span>
          <dl className="keys">
            <dt>클릭 · 드래그</dt><dd>물건 선택 · 옮기기 (빈 곳 드래그는 카메라 회전)</dd>
            <dt><K>Q</K> <K>E</K></dt><dd>회전 15° (<K>Shift</K> 90°)</dd>
            <dt><K>[</K> <K>]</K></dt><dd>크기 줄이기 · 키우기</dd>
            <dt><K>Delete</K></dt><dd>창고에 넣기</dd>
            <dt><K>WASD</K> · 휠</dt><dd>화면 이동 · 확대</dd>
          </dl>
          <p className="sel">{S.sel ? `선택: ${S.sel.name}${Math.abs(S.sel.g.scale.x - (S.sel.baseScale || 1)) > 0.01 ? ` ×${(S.sel.g.scale.x / (S.sel.baseScale || 1)).toFixed(2)}` : ''}` : '선택한 물건 없음'}</p>
          <div className="row">
            <button disabled={!S.sel} onClick={() => G.edit.rotateSel(15)}>↺ 15°</button>
            <button disabled={!S.sel} onClick={() => G.edit.rotateSel(-15)}>↻ 15°</button>
            <button disabled={!S.sel} onClick={() => G.edit.rotateSel(90)}>90°</button>
            <button disabled={!S.sel} onClick={() => G.edit.scaleSel(1 / 1.15)}>작게</button>
            <button disabled={!S.sel} onClick={() => G.edit.scaleSel(1.15)}>크게</button>
          </div>
          <div className="row">
            <button disabled={!S.sel} onClick={() => G.edit.putAwaySel()}>창고에 넣기</button>
            <button disabled={!S.sel || S.sel.spawned} onClick={() => G.edit.resetSel()}>원위치</button>
            <button onClick={() => G.edit.resetAll()}>전체 초기화</button>
            <button className="primary" onClick={() => G.edit.toggle()}>편집 끝내기 (B)</button>
          </div>
          {ui.resetConfirm && <p className="empty">한 번 더 누르면 꺼낸 물건은 창고로 가고, 집 가구는 처음 자리로 돌아가요.</p>}
        </section>
      )}

      {S.editMode && <Warehouse />}

      {S.reels && (
        <section className="box">
          <span className="mode">REELS · 9:16</span>
          <dl className="keys">
            <dt><K>W</K> <K>A</K> <K>D</K></dt><dd>앞으로 걷기 · 방향 틀기 (카메라가 앞에서 물러남)</dd>
            <dt><K>Shift</K> · 휠</dt><dd>달리기 · 카메라 거리</dd>
            <dt><K>V</K></dt><dd>녹화 시작 / 정지</dd>
          </dl>
          <div className="row">
            <button className="primary" onClick={() => G.toggleRec()}>{S.recording ? '녹화 정지 (V)' : '녹화 시작 (V)'}</button>
            <button onClick={() => G.toggleReels()}>나가기 (R)</button>
          </div>
        </section>
      )}

      {(S.photo || S.reels) && (
        <section className="box">
          <h2>자막</h2>
          <Choices items={SUB_STYLES} isOn={(s) => S.subStyle === s.key} onPick={(s) => G.setSubStyle(s.key)} label={(s) => s.label} />
          {S.subStyle === 'dialog' ? (
            <input type="text" value={S.subs.dialog} placeholder="……いくらいる？" maxLength={40} aria-label="대화창 문구" onChange={(e) => G.setSubs({ dialog: e.target.value })} />
          ) : (
            <>
              <input type="text" value={S.subs.jp} placeholder="今日も会社に行きたくない" maxLength={40} aria-label="일본어 자막 (노란색)" onChange={(e) => G.setSubs({ jp: e.target.value })} />
              <input type="text" value={S.subs.kr} placeholder="오늘도 회사 가기 싫다" maxLength={40} aria-label="한국어 자막 (흰색)" onChange={(e) => G.setSubs({ kr: e.target.value })} />
            </>
          )}
        </section>
      )}

      <section className="box">
        <h2>꾸미기</h2>
        <Choices items={ACC} isOn={(a) => S.acc[a.key]} onPick={(a) => G.toggleAcc(a.key)} label={(a) => a.label} />
        <h3 className="sub">크기</h3>
        <div className="row size-row">
          <button aria-label="작게" disabled={S.size <= SIZE_MIN + 1e-6} onClick={() => G.setSize(Math.max(SIZE_MIN, Math.round((S.size - SIZE_STEP) * 10) / 10))}>−</button>
          <span className="size-val">×{S.size.toFixed(1)}</span>
          <button aria-label="크게" disabled={S.size >= SIZE_MAX - 1e-6} onClick={() => G.setSize(Math.min(SIZE_MAX, Math.round((S.size + SIZE_STEP) * 10) / 10))}>+</button>
          <button disabled={Math.abs(S.size - 1) < 1e-6} onClick={() => G.setSize(1)}>보통</button>
        </div>
      </section>

      <section className="box">
        <h2>화질</h2>
        <Choices items={QUALITY} isOn={(_, i) => S.qualIdx === i} onPick={(_, i) => G.setQuality(i)} label={(q) => q.name} />
      </section>

      <section className="box">
        <h2>앨범</h2>
        {ui.album.length ? (
          <div className="album">
            {ui.album.slice(0, 12).map((u, i) => (
              <img key={u.slice(-24) + i} src={u} alt={`찍은 사진 ${i + 1}`} onClick={() => G.setUi({ shotUrl: u })} />
            ))}
          </div>
        ) : <p className="empty">아직 찍은 사진이 없어요. 사진 모드에서 Space.</p>}
      </section>
    </aside>
  );
}
