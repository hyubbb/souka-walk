import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Game } from '../game';

export const GameContext = createContext<Game | null>(null);

/** Returns the game and re-renders whenever the game calls notify(). */
export function useGame(): Game | null {
  const G = useContext(GameContext);
  useSyncExternalStore(
    (fn) => (G ? G.subscribe(fn) : () => {}),
    () => (G ? G.version() : 0),
  );
  return G;
}
