/**
 * E2E Test Configuration
 *
 * Centralized configuration for test timeouts and behavior.
 * Provides fast defaults for quick test execution.
 */

/** Mission launch countdown duration in seconds (default game value is 10) */
export const TEST_COUNTDOWN_SECONDS = 1;

/** Default timeouts for various operations (in ms) */
export const TIMEOUTS = {
  /** Waiting for page navigation or screen transitions */
  navigation: 5000,
  /** Waiting for WebRTC connection establishment */
  connection: 8000,
  /** Waiting for state sync between host/guest */
  sync: 3000,
  /** Waiting for UI elements to appear (needs time for game initialization) */
  ui: 5000,
  /** Waiting for mission to start (includes 1s countdown + asset loading + initialization) */
  missionStart: 15000,
  /** Waiting for lobby operations */
  lobby: 5000,
  /** Short wait for immediate UI feedback */
  fast: 1000,
};

/**
 * Inject test configuration into a page.
 * Call this after page.goto() to set test mode flags.
 *
 * @param {import('playwright').Page} page
 */
export async function injectTestConfig(page) {
  await page.evaluate((countdownSeconds) => {
    window.__TEST_COUNTDOWN_SECONDS__ = countdownSeconds;
  }, TEST_COUNTDOWN_SECONDS);
}

/**
 * Create a page with test configuration injected.
 * Wraps context.newPage() to auto-inject test config after navigation.
 *
 * @param {import('playwright').BrowserContext} context
 * @returns {Promise<import('playwright').Page>}
 */
export async function createTestPage(context) {
  const page = await context.newPage();

  // Inject config after each navigation
  page.on('load', async () => {
    await injectTestConfig(page).catch(() => {});
  });

  return page;
}
