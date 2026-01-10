/// <reference types="vite/client" />

/**
 * Vite Build-time Constants
 */

/** Application version from package.json, injected at build time */
declare const __APP_VERSION__: string;

/**
 * Vite Asset Import Types
 *
 * These declarations tell TypeScript how to handle Vite's asset imports.
 */

// SVG files imported normally return a URL string
declare module '*.svg' {
  const src: string;
  export default src;
}

// SVG files imported with ?raw return raw content string
declare module '*.svg?raw' {
  const content: string;
  export default content;
}

// PNG/JPG/GIF images return URL strings
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}
