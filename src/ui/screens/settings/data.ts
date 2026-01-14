/**
 * Settings Data Tab - Campaign export/import functionality.
 */

/** Render the data tab content */
export function renderDataTab(hasCampaign: boolean): string {
  return `
    <div class="settings-section" role="tabpanel">
      <h3 class="settings-section-title">Campaign Data</h3>
      <p class="settings-section-desc">
        Export your campaign to a file for backup, or import a previously exported campaign.
      </p>

      <div class="settings-data-buttons">
        <button
          class="btn btn-large"
          id="btn-export-campaign"
          ${hasCampaign ? '' : 'disabled'}
          ${hasCampaign ? '' : 'title="No campaign to export"'}
        >
          Export Campaign
        </button>
        <button class="btn btn-large" id="btn-import-campaign">
          Import Campaign
        </button>
      </div>

      ${
        hasCampaign
          ? `<p class="settings-data-note">
          Your campaign is automatically saved. Exporting creates a backup file you can use to restore your progress.
        </p>`
          : `<p class="settings-data-note">
          Start a new campaign to enable export. You can import a previously exported campaign at any time.
        </p>`
      }
    </div>
  `;
}
