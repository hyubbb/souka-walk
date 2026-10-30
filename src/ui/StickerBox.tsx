import { useEffect, useRef, useState } from 'react';
import { useGame } from './useGame';
import { STICKER_COLORS, type StickerData } from '../game/stickers';

const STYLES: { key: StickerData['style']; label: string }[] = [{ key: 'none', label: '글씨만' }, { key: 'plate', label: '간판' }, { key: 'neon', label: '네온' }];
const FONTS: { key: StickerData['font']; label: string }[] = [{ key: 'gothic', label: '고딕' }, { key: 'dot', label: '도트' }, { key: 'serif', label: '명조' }];

/** Edit mode: write some words and stick them anywhere (walls, glass, the floor). */
export function StickerBox() {
  const G = useGame();
  const [d, setD] = useState<StickerData>({ text: 'ABC', color: '#ffffff', style: 'none', font: 'gothic', vertical: false });
  const sel = G?.S.sel?.sticker ? G.S.sel : null;
  const file = useRef<HTMLInputElement>(null);
  const isImage = !!sel?.sticker?.image;
  // selecting a sticker loads its look into the form, so it can be changed
  useEffect(() => { if (sel?.sticker && !sel.sticker.image) setD({ ...sel.sticker }); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!G) return null;
  const set = (p: Partial<StickerData>) => { const n = { ...d, ...p, image: undefined }; setD(n); if (sel && !isImage) G.stickers.restyle(sel, n); };
  const loadImage = async (f?: File | null) => {
    if (!G || !f) return;
    try {
      const image = await G.stickers.readImage(f);
      const o = G.stickers.spawn({ ...d, text: '', image }); G.edit.select(o); G.edit.saveSoon();
      G.toast('사진을 끌어서 벽이나 유리에 붙여 보세요.');
    } catch { G.toast('이 파일은 불러올 수 없어요.'); }
    if (file.current) file.current.value = '';
  };
  const make = () => { if (!d.text.trim()) return; const o = G.stickers.spawn(d); G.edit.select(o); G.edit.saveSoon(); G.toast('글씨를 끌어서 벽이나 유리에 붙여 보세요.'); };

  return (
    <section className="box">
      <h2>글씨·사진 붙이기</h2>
      <textarea className="sticker-text" rows={2} maxLength={60} value={d.text} placeholder="붙일 글씨 (줄바꿈 가능)" aria-label="붙일 글씨"
        onChange={(e) => set({ text: e.target.value })} />
      <div className="row swatches" role="group" aria-label="글씨 색">
        {STICKER_COLORS.map((c) => (
          <button key={c} className="swatch" aria-label={c} aria-pressed={d.color === c} style={{ background: c }} onClick={() => set({ color: c })} />
        ))}
      </div>
      <div className="row">
        {STYLES.map((s) => <button key={s.key} aria-pressed={d.style === s.key} onClick={() => set({ style: s.key })}>{s.label}</button>)}
        <button aria-pressed={d.vertical} onClick={() => set({ vertical: !d.vertical })}>세로쓰기</button>
      </div>
      <div className="row">
        {FONTS.map((f) => <button key={f.key} aria-pressed={d.font === f.key} onClick={() => set({ font: f.key })}>{f.label}</button>)}
      </div>
      <div className="row">
        <button className="primary" onClick={make}>새 글씨 만들기</button>
        <button onClick={() => file.current?.click()}>사진 불러오기</button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => loadImage(e.target.files?.[0])} />
      </div>
      <p className="empty">{isImage ? '선택한 사진을 끌어서 붙여요. Q/E로 돌리고 [ ]로 크기를 바꿔요.' : sel ? '선택한 글씨를 고치는 중이에요. 바꾸면 바로 반영돼요.' : '만든 글씨를 끌면 벽·유리·바닥 어디든 붙어요. Q/E로 돌리고 [ ]로 크기를 바꿔요.'}</p>
    </section>
  );
}
