// Builds the whole game into a stage element. Module order matters: the alley and the house use the
// seeded random generator, so building them in a different order would change the street layout.
import { createCore } from './core';
import { setupLighting } from './lighting';
import { buildAlley } from './world/alley';
import { buildHouse } from './world/house';
import { buildCharacter } from './character';
import { setupInteract } from './interact';
import { setupVehicles } from './vehicles';
import { setupCity } from './world/city';
import { setupProps } from './props';
import { setupCapture } from './capture';
import { setupModes } from './modes';
import { setupEdit } from './edit';
import { setupQuality } from './quality';
import { setupInput } from './input';
import { setupLoop } from './loop';
import type { Game } from './types';

export type { Game } from './types';

export function createGame(stage: HTMLElement): Game {
  const G = createCore(stage);
  setupLighting(G);
  buildAlley(G);
  buildHouse(G);
  buildCharacter(G);
  setupInteract(G);
  setupProps(G);
  setupVehicles(G);
  setupCity(G);
  setupCapture(G);
  setupModes(G);
  setupEdit(G);
  setupQuality(G);
  setupInput(G);
  setupLoop(G);

  G.edit.loadLayout();
  G.props.defaultsReady.then(() => { G.props.settle(); G.city.settle(); });
  G.applyTime(0);
  G.setPose('stand');
  G.setQuality(2);
  G.setFrame('wide');
  G.setMouth('line');
  G.applyAcc();
  G.fit();
  setTimeout(() => G.toast('아침이다. ……출근하자.'), 600);
  document.fonts?.load('20px "DotGothic16"');
  G.start();
  return G;
}
