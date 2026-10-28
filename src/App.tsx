import { useEffect, useRef, useState } from 'react';
import { createGame, type Game } from './game';
import { GameContext } from './ui/useGame';
import { Overlays } from './ui/Overlays';
import { Panel } from './ui/Panel';
import { Modals } from './ui/Modals';

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!stageRef.current) return;
    const G = createGame(stageRef.current);
    setGame(G);
    stageRef.current.focus();
    return () => { G.stop(); G.disposeInput?.(); G.renderer.dispose(); G.canvas.remove(); G.comp.remove(); };
  }, []);

  return (
    <GameContext.Provider value={game}>
      <div className="wrap">
        <div className="stage" ref={stageRef} tabIndex={0} aria-label="게임 화면. 클릭 후 키보드로 조작">
          <Overlays />
        </div>
        <Panel />
      </div>
      <Modals />
    </GameContext.Provider>
  );
}
