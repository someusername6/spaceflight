/**
 * HUD CSS styles - extracted for file size management.
 */

/** Style element ID to prevent duplicates */
export const HUD_STYLE_ID = 'hud-styles';

/** Get HUD CSS styles */
export function getHUDStyles(): string {
  return `
    #hud {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: "Lucida Console", "Consolas", monospace;
      font-weight: bold;
      color: #0f0;
      overflow: hidden;
      text-transform: uppercase;
    }
    .status-panel {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(0, 0, 0, 0.6);
      padding: 10px 12px;
      border: 1px solid #0f0;
    }
    .match-speed-indicator {
      position: absolute;
      bottom: 170px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 14px;
      color: #0af;
      background: rgba(0, 0, 0, 0.6);
      padding: 4px 10px;
      border: 1px solid #0af;
    }
    /* Common row styling */
    .bar-row,
    .bar-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bar-label {
      width: 40px;
      font-size: 13px;
    }
    .bar-value {
      width: 48px;
      font-size: 15px;
      text-align: right;
    }
    /* Speed bar with throttle marker */
    .speed-row {
      margin-bottom: 8px;
    }
    .speed-row .bar-value {
      font-size: 20px;
    }
    .speed-bar {
      position: relative;
      width: 180px;
      height: 14px;
      background: rgba(0, 20, 0, 0.5);
      border: 1px solid #0a0;
    }
    .speed-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 0%;
      background: #0f0;
      transition: width 0.05s linear;
    }
    .afterburner-fill {
      position: absolute;
      top: 0;
      height: 100%;
      width: 0%;
      background: #f80;
      transition: width 0.05s linear;
    }
    .max-speed-tick {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      background: #0a0;
      transform: translateX(-50%);
    }
    .throttle-marker {
      position: absolute;
      bottom: -12px;
      left: 0%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #0f0;
      line-height: 1;
      transition: left 0.05s linear;
    }
    /* Status bars */
    .bar {
      width: 180px;
      height: 12px;
      background: rgba(0, 20, 0, 0.5);
      border: 1px solid #0a0;
      padding: 1px;
    }
    .bar-segments {
      display: flex;
      gap: 2px;
      height: 100%;
    }
    .segment {
      flex: 1;
      background: rgba(0, 40, 0, 0.5);
    }
    /* Shield bar colors */
    .shield-bar .segment.filled { background: #0af; }
    .bar-container.warning .shield-bar .segment.filled { background: #066; }
    .bar-container.warning .bar-label,
    .bar-container.warning .bar-value { color: #066; }
    /* Ionized state - purple/magenta glow indicates suppressed regen */
    .bar-container.ionized .shield-bar .segment.filled { background: #c0f; }
    .bar-container.ionized .bar-label,
    .bar-container.ionized .bar-value { color: #c0f; }
    .bar-container.ionized {
      animation: pulse 0.8s ease-in-out infinite alternate;
    }
    /* Hull bar colors */
    .hull-bar .segment.filled { background: #0f0; }
    /* Warning state: hull 30-50% */
    .bar-container.hull-warning .hull-bar .segment.filled { background: #f80; }
    .bar-container.hull-warning .bar-label,
    .bar-container.hull-warning .bar-value { color: #f80; }
    /* Critical state: hull < 30% */
    .bar-container.critical .hull-bar .segment.filled { background: #f00; }
    .bar-container.critical .bar-label,
    .bar-container.critical .bar-value { color: #f00; }
    .bar-container.critical {
      animation: pulse 0.5s ease-in-out infinite alternate;
    }
    /* Heat bar colors */
    .heat-bar .segment.filled { background: #f80; }
    .bar-container.danger .heat-bar .segment.filled { background: #f00; }
    .bar-container.danger .bar-label,
    .bar-container.danger .bar-value { color: #f00; }
    .bar-container.danger {
      animation: pulse 0.3s ease-in-out infinite alternate;
    }
    @keyframes pulse {
      from { opacity: 1; }
      to { opacity: 0.5; }
    }
    /* Disable all transitions - used during discontinuities (e.g., replay seeking) */
    #hud.no-transitions,
    #hud.no-transitions * {
      transition: none !important;
    }
  `;
}
