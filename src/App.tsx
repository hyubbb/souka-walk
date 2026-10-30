import { useEffect, useRef, useState } from 'react';
import { createGame, type Game } from './game';
import { GameContext } from './ui/useGame';
import { Overlays } from './ui/Overlays';
import { Panel } from './ui/Panel';
import { Modals } from './ui/Modals';
import { TouchControls } from './ui/TouchControls';
import { MenuButton } from './ui/MenuButton';

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!stageRef.current) return;
    const G = createGame(stageRef.current);
    setGame(G);
    if (import.meta.env.DEV || location.search.includes('debug')) (window as any).__G = G; // console / test handle
    stageRef.current.focus();
    return () => { G.stop(); G.disposeInput?.(); G.renderer.dispose(); G.canvas.remove(); G.comp.remove(); };
  }, []);

  return (
    <GameContext.Provider value={game}>
      <div className="wrap">
        <div className="stage" ref={stageRef} tabIndex={0} aria-label="게임 화면. 클릭 후 키보드로 조작">
          <Overlays />
          <TouchControls />
        </div>
        <Panel />
      </div>
      <MenuButton />
      <Modals />
    </GameContext.Provider>
  );
}
