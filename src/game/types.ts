import type * as THREE from 'three';

export type Zone = 'house' | 'alley';
export type Pose = 'stand' | 'think' | 'sit' | 'lie' | 'ride';
export type SubStyle = 'dialog' | 'movie';
export type Frame = 'wide' | 'close';

export interface Collider { minX: number; maxX: number; minZ: number; maxZ: number; veh?: any }

/** An object the player can move in edit mode (one THREE.Group). */
export interface EditObj {
  name: string;
  label: string;
  g: THREE.Object3D;
  cols: { col: Collider; lx: number; lz: number; hw: number; hd: number }[];
  off: number;
  init: { x: number; y?: number; z: number; r: number };
  hidden: boolean;
  persist: boolean;
  dyn?: boolean;
  hold?: Holdable;
}

export interface Holdable { obj: THREE.Object3D; name: string; hold: [number, number, number]; rx: number }

export interface Seat { y: number; rot: number; pose: Pose; exit?: [number, number]; msg?: string; rl?: number; el?: [number, number] }

export interface Spot {
  zone: Zone;
  at: [number, number];
  label: string;
  r?: number;
  obj?: string;
  seat?: Seat;
  act?: () => void;
  o?: EditObj;
  l?: [number, number];
}

/** All mutable game state lives here so every module (and the React UI) reads the same values. */
export interface State {
  zone: Zone;
  pose: Pose;
  expr: string;
  mouth: string;
  acc: { blush: boolean; hat: boolean; phones: boolean };
  photo: boolean;
  reels: boolean;
  editMode: boolean;
  guide: boolean;
  seat: Seat | null;
  seatY: number;
  held: Holdable | null;
  riding: any;
  reach: number;
  camYaw: number;
  camPitch: number;
  camDist: number;
  walkPitch: Record<Zone, number>;
  frame: Frame;
  walkPhase: number;
  speedNow: number;
  blinkT: number;
  idleT: number;
  timeIdx: number;
  qualIdx: number;
  clockBase: string;
  taskDone: boolean;
  subStyle: SubStyle;
  subs: { dialog: string; jp: string; kr: string };
  drag: { x: number; y: number } | null;
  sel: EditObj | null;
  recording: boolean;
}

/** What the React UI shows that is not part of the game state itself. */
export interface UiState {
  clock: string;
  room: string;
  task: string;
  prompt: string;
  toast: string;
  fading: boolean;
  rec: string;
  album: string[];
  shotUrl: string | null;
  video: { url: string; note: string } | null;
  resetConfirm: boolean;
}

export type Game = {
  S: State;
  ui: UiState;
  notify: () => void;
  subscribe: (fn: () => void) => () => void;
  version: () => number;
  [key: string]: any;
};
