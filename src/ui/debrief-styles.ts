/**
 * Debrief UI styles - CSS styles for the combat debrief screen.
 */

/** Get debrief CSS styles */
export function getDebriefStyles(): string {
  return `
    .debrief-section {
      margin-top: 20px;
      width: 100%;
    }

    .debrief-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #3a5a8a;
    }

    .debrief-header h2 {
      margin: 0;
      color: #8ab4f8;
      font-size: 1.3em;
    }

    .mission-time {
      color: #7a9aba;
      font-size: 0.95em;
    }

    .pilot-cards {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .pilot-card {
      background: rgba(25, 40, 60, 0.9);
      border: 1px solid #2a4a6a;
      border-radius: 4px;
      padding: 12px;
    }

    .pilot-card.player {
      border-color: #4da6ff;
      background: rgba(30, 50, 80, 0.9);
    }

    .pilot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .pilot-info {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .callsign {
      font-weight: bold;
      font-size: 1.1em;
      color: #aad4ff;
    }

    .archetype {
      color: #7a9aba;
      font-size: 0.9em;
      text-transform: capitalize;
    }

    .pilot-status {
      font-size: 0.9em;
      padding: 3px 10px;
      border-radius: 3px;
    }

    .pilot-status.survived {
      background: rgba(68, 204, 102, 0.2);
      color: #44cc66;
    }

    .pilot-status.kia {
      background: rgba(204, 68, 68, 0.2);
      color: #cc4444;
    }

    .time-of-death {
      color: #999;
      margin-left: 5px;
    }

    .pilot-stats {
      display: flex;
      gap: 20px;
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #2a4a6a;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 60px;
    }

    .stat-value {
      font-size: 1.4em;
      font-weight: bold;
      color: #e0e0e0;
    }

    .stat-value.destroyed {
      color: #cc4444;
    }

    .stat-label {
      font-size: 0.75em;
      color: #7a9aba;
      text-transform: uppercase;
    }

    .weapon-breakdown {
      overflow-x: auto;
    }

    .weapon-breakdown table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85em;
    }

    .weapon-breakdown th {
      text-align: left;
      color: #6a8aaa;
      font-weight: normal;
      padding: 5px 8px;
      border-bottom: 1px solid #2a4a6a;
    }

    .weapon-breakdown td {
      padding: 6px 8px;
      color: #b0c0d0;
    }

    .weapon-breakdown td.damage {
      color: #ff9966;
      text-align: right;
    }

    .weapon-breakdown td.no-weapons {
      color: #5a6a7a;
      font-style: italic;
      text-align: center;
    }

    .weapon-breakdown tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.03);
    }
  `;
}
