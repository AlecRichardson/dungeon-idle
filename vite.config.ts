export default {
  // Relative URLs work on GitHub's /dungeon-idle/ path and in local previews.
  base: './',
  build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
};
