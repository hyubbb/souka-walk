// The big models (Takeshiba map, GT-R, Supra, market stall). The single-file build swaps this module for
// heavyAssets.empty.ts (see vite.config.ts) so the one-page artifact stays under its size limit.
export const HEAVY_URLS = import.meta.glob('../assets/pack3/big/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
