import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` inlines everything into one dist/index.html
// (used to publish the game as a single self-contained page). That page has a 16 MB limit,
// so it leaves out the heavy models in src/assets/pack3/big.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  resolve: mode === 'single'
    ? { alias: [{ find: /^\.{1,2}\/heavyAssets$/, replacement: '/src/game/heavyAssets.empty.ts' }] }
    : {},
  build: { chunkSizeWarningLimit: 1500 },
}));
