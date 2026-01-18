import { readFileSync } from 'node:fs';
import { optimize } from 'svgo';
import { defineConfig, type Plugin } from 'vite';
import pkg from './package.json';

/**
 * Custom Vite plugin to optimize SVGs at build time.
 *
 * Intercepts .svg?raw imports and runs SVGO before bundling.
 * This keeps source SVGs readable while serving optimized versions.
 */
function svgoPlugin(): Plugin {
  return {
    name: 'svgo-optimizer',
    enforce: 'pre',
    load(id) {
      const [path, query] = id.split('?');
      if (path.endsWith('.svg') && query === 'raw') {
        const svg = readFileSync(path, 'utf-8');
        const optimized = optimize(svg, { multipass: true });
        return `export default ${JSON.stringify(optimized.data)}`;
      }
    },
  };
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [svgoPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          'geometry-ships': ['./src/rendering/ship-geometry-ships.ts'],
          'geometry-structures': [
            './src/rendering/ship-geometry-structures.ts',
          ],
        },
      },
    },
  },
});
