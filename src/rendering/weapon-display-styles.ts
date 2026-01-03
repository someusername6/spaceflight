/**
 * Weapon display CSS styles - extracted for file size management.
 */

/** Get CSS styles for weapon display */
export function getWeaponDisplayStyles(): string {
  return `
    .weapon-display {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12px;
    }
    .weapon-section {
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #0a0;
      padding: 6px 8px;
      min-width: 140px;
    }
    .section-label {
      font-size: 10px;
      color: #0a0;
      margin-bottom: 4px;
      letter-spacing: 1px;
    }
    .key-hint {
      color: #050;
      font-size: 8px;
      margin-left: 4px;
    }
    .link-indicator {
      font-size: 9px;
      padding: 2px 4px;
      margin-bottom: 4px;
      text-align: center;
      letter-spacing: 1px;
    }
    .link-indicator::after {
      content: ' [V]';
      color: #050;
      font-size: 8px;
    }
    .link-indicator.linked {
      color: #4f4;
      background: rgba(0, 100, 0, 0.4);
      border: 1px solid #0a0;
    }
    .link-indicator.single {
      color: #666;
      background: rgba(0, 30, 0, 0.3);
      border: 1px solid #333;
    }
    .weapon-bank {
      padding: 3px 6px;
      background: rgba(0, 30, 0, 0.4);
      border-left: 2px solid transparent;
      margin-top: 3px;
    }
    .section-label + .weapon-bank {
      margin-top: 0;
    }
    .weapon-bank.selected {
      background: rgba(0, 60, 0, 0.6);
      border-left-color: #0f0;
    }
    .weapon-bank.selected.cooldown {
      border-left-color: #860;
    }
    .weapon-bank.selected.cooldown .weapon-name {
      color: #a80;
    }
    .weapon-bank.empty {
      opacity: 0.5;
    }
    .weapon-name {
      color: #0f0;
      font-size: 11px;
    }
    .weapon-bank.selected .weapon-name {
      color: #4f4;
    }
    .weapon-info {
      display: flex;
      gap: 8px;
      font-size: 10px;
      margin-top: 2px;
    }
    .ammo {
      color: #0a0;
    }
    .ammo.depleted {
      color: #f00;
    }
    .heat-mini {
      color: #f80;
    }
    .heat-mini.hot {
      color: #f00;
      animation: pulse 0.3s ease-in-out infinite alternate;
    }
    .weapon-type {
      font-size: 9px;
      padding: 1px 3px;
      margin-top: 2px;
      display: inline-block;
    }
    .weapon-type.beam {
      background: #306;
      color: #c6f;
    }
    .lock-status {
      font-size: 9px;
      padding: 1px 4px;
    }
    .lock-status.no-target {
      color: #666;
    }
    .lock-status.locking {
      color: #ff0;
      animation: blink 0.5s ease-in-out infinite;
    }
    .lock-status.locked {
      color: #0f0;
      background: rgba(0, 255, 0, 0.2);
    }
    .lock-status.dumbfire {
      color: #f80;
    }
    .lock-status.dumbfire-dim {
      color: #864;
    }
    .lock-status.lock-req {
      color: #555;
    }
    .no-weapon {
      color: #444;
      font-size: 10px;
      padding: 2px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes pulse {
      from { opacity: 0.7; }
      to { opacity: 1; }
    }
  `;
}
