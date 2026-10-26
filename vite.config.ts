export default {
  build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
};
