import { useEffect, useState } from 'react';
import { useGame } from './useGame';
import { CATALOG, CATS, type CatKey } from '../game/catalog';
import type { EditObj } from '../game/types';

type Tab = CatKey | 'box';

/** The warehouse: everything from the Kenney kits by room, plus the house's own things you have put away. */
export function Warehouse() {
  const G = useGame();
  const [tab, setTab] = useState<Tab>('living');
  const items = tab === 'box' ? [] : CATALOG.filter((c) => c.cat === tab);
  useEffect(() => { if (G && items.length) G.props.wantThumbs(items.map((i) => i.id)); }, [G, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!G) return null;
  const stored: EditObj[] = G.props.stored();
  const thumbs: Record<string, string> = G.props.thumbs;

  return (
    <section className="box">
      <h2>창고</h2>
      <div className="tabs" role="tablist">
        {CATS.map((c) => (
          <button key={c.key} role="tab" aria-selected={tab === c.key} onClick={() => setTab(c.key)}>{c.label}</button>
        ))}
        <button role="tab" aria-selected={tab === 'box'} onClick={() => setTab('box')}>보관함{stored.length ? ` ${stored.length}` : ''}</button>
      </div>
      {tab === 'box' ? (
        stored.length ? (
          <div className="ware">
            {stored.map((o) => (
              <button key={o.name} className="ware-item" onClick={() => G.props.takeBack(o)} title={`${o.name} 꺼내기`}>
                {o.item && thumbs[o.item.id] ? <img src={thumbs[o.item.id]} alt="" /> : <span className="ware-blank" />}
                <span>{o.name}</span>
              </button>
            ))}
          </div>
        ) : <p className="empty">넣어 둔 물건이 없어요. 물건을 고르고 '창고에 넣기'를 누르면 여기로 와요.</p>
      ) : (
        <div className="ware">
          {items.map((it) => (
            <button key={it.id} className="ware-item" onClick={() => G.props.takeOut(it.id)} title={`${it.name} 꺼내기`}>
              {thumbs[it.id] ? <img src={thumbs[it.id]} alt="" /> : <span className="ware-blank" />}
              <span>{it.name}</span>
            </button>
          ))}
        </div>
      )}
      <p className="empty">누르면 화면 가운데에 꺼내져요. 큰 물건은 바닥에, 작은 물건은 그 아래 가구 위에 놓여요.</p>
    </section>
  );
}
