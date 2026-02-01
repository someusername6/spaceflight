/// <reference types="vite/client" />

/**
 * Vite Build-time Constants
 */

/** Application version from package.json, injected at build time */
declare const __APP_VERSION__: string;

/**
 * Vite Environment Variables
 *
 * Custom environment variables must be prefixed with VITE_ to be exposed.
 * See: https://vitejs.dev/guide/env-and-mode.html
 */
interface ImportMetaEnv {
  /** Signaling server URL for multiplayer (defaults to production if not set) */
  readonly VITE_SIGNALING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

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

/**
 * Test-only Window Extensions
 *
 * These properties are set by E2E tests to control game behavior.
 */
interface Window {
  /** Override countdown duration for E2E tests (in seconds) */
  __TEST_COUNTDOWN_SECONDS__?: number;
}
