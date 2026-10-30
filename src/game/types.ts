import type * as THREE from 'three';

export type Zone = 'house' | 'alley';
/** Outdoors: the alley, or Takeshiba through the ticket gate (same zone, different place). */
export type Area = 'alley' | 'city' | 'yokohama';
export type Pose = 'stand' | 'think' | 'sit' | 'lie' | 'ride' | 'drive' | 'hug' | 'money' | 'count' | 'peek';
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
  /** Kenney catalog entry this object was made from. */
  item?: import('./catalog').CatalogItem;
  /** Taken out of the warehouse (saved in the layout's spawned list; putting it away deletes it). */
  spawned?: boolean;
  uid?: string;
  /** Small thing that sits on whatever surface is under it. */
  top?: boolean;
  /** Wall-mounted: keeps its height when dragged. */
  fixedY?: boolean;
  ready?: Promise<unknown>;
  /** Starting size multiplier (house furniture that is bigger or smaller than the catalog default). */
  baseScale?: number;
  /** Height came from the saved layout: do not re-settle it. */
  keepY?: boolean;
  size?: { w: number; d: number; h: number };
  /** A text sticker (its words and look) and its spin around the surface normal. */
  sticker?: import('./stickers').StickerData;
  stickerSpin?: number;
}

export interface Holdable { obj: THREE.Object3D; name: string; hold: [number, number, number]; rx: number }

export interface Seat { y: number; rot: number; pose: Pose; exit?: [number, number]; msg?: string; rl?: number; el?: [number, number]; auto?: boolean }

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
  area: Area;
  /** souka's size (1 = normal), set in the panel and remembered in the browser. */
  size: number;
  pose: Pose;
  expr: string;
  mouth: string;
  acc: { blush: boolean; hat: boolean; phones: boolean };
  photo: boolean;
  reels: boolean;
  /** reels camera: front = stays in front of souka, free = drag it anywhere and walk like normal */
  reelCam: 'front' | 'free';
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
  /** view options (saved in this browser) */
  big: boolean;          // game fills the whole window, menu becomes a drawer
  menuOpen: boolean;
  showClock: boolean;    // date + place, top left
  showTask: boolean;     // "할 일", top right
  showTalk: boolean;     // souka's one-liners / arrival notes in the middle of the screen
}

export type Game = {
  S: State;
  ui: UiState;
  notify: () => void;
  subscribe: (fn: () => void) => () => void;
  version: () => number;
  [key: string]: any;
};
