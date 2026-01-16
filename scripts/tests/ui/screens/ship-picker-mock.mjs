/**
 * Ship Picker Mock Data and Screen
 *
 * Shared mock infrastructure for ship picker tests.
 */

/**
 * Create mock campaign state for testing.
 */
export function createMockCampaignState(overrides = {}) {
  return {
    ships: [
      { id: 'ship1', shipClass: 'Fighter', pilot: 'pilot1' },
      { id: 'ship2', shipClass: 'Scout', pilot: null },
      { id: 'ship3', shipClass: 'Fighter', pilot: 'pilot2' },
    ],
    storedShips: [
      { shipClass: 'Patrol' },
      { shipClass: 'Patrol' },
      { shipClass: 'Scout' },
    ],
    pilots: [
      { id: 'pilot1', callsign: 'Viper' },
      { id: 'pilot2', callsign: 'Shadow' },
    ],
    ...overrides,
  };
}

/** Render ship picker content (mirrors real implementation) */
function renderShipPickerContent(currentShipId, campaignState) {
  const emptyShips = campaignState.ships.filter(
    (s) => s.pilot === null && s.id !== currentShipId,
  );
  const storedShips = campaignState.storedShips;

  // Group stored ships by class
  const groups = new Map();
  for (let i = 0; i < storedShips.length; i++) {
    const ship = storedShips[i];
    if (!ship) continue;
    const existing = groups.get(ship.shipClass);
    if (existing) {
      existing.count++;
    } else {
      groups.set(ship.shipClass, { firstIndex: i, count: 1 });
    }
  }

  const scrollableSections = [];

  // Empty active ships section
  if (emptyShips.length > 0) {
    const shipCards = emptyShips
      .map(
        (ship) => `
        <button class="ship-picker-card" data-action="swap-to-ship" data-ship-id="${ship.id}">
          <div class="ship-picker-icon">
            <img src="/assets/ships/${ship.shipClass.toLowerCase()}.svg" alt="${ship.shipClass}" />
          </div>
          <div class="ship-picker-name">${ship.shipClass}</div>
        </button>
      `,
      )
      .join('');

    scrollableSections.push(`
      <div class="ship-picker-section">
        <div class="ship-picker-section-label">Available Ships</div>
        <div class="ship-picker-grid">${shipCards}</div>
      </div>
    `);
  }

  // Stored ships section
  if (storedShips.length > 0) {
    const groupedShips = [...groups.entries()].map(([shipClass, data]) => ({
      shipClass,
      ...data,
    }));

    const shipCards = groupedShips
      .map((group) => {
        const countBadge =
          group.count > 1
            ? `<span class="ship-picker-count">×${group.count}</span>`
            : '';
        return `
          <button class="ship-picker-card" data-action="swap-to-stored-ship" data-stored-ship-index="${group.firstIndex}">
            <div class="ship-picker-icon">
              <img src="/assets/ships/${group.shipClass.toLowerCase()}.svg" alt="${group.shipClass}" />
            </div>
            <div class="ship-picker-name">${group.shipClass}${countBadge}</div>
          </button>
        `;
      })
      .join('');

    scrollableSections.push(`
      <div class="ship-picker-section">
        <div class="ship-picker-section-label">Stored Ships</div>
        <div class="ship-picker-grid">${shipCards}</div>
      </div>
    `);
  }

  // No options message
  if (emptyShips.length === 0 && storedShips.length === 0) {
    scrollableSections.push(`
      <div class="ship-picker-empty">
        No other ships available
      </div>
    `);
  }

  return `
    <div class="ship-picker-content">
      ${scrollableSections.join('')}
    </div>
    <div class="ship-picker-footer">
      <button class="btn btn-danger ship-picker-unassign" data-action="unassign">
        Unassign Pilot
      </button>
    </div>
  `;
}

/** Ship picker screen component (mirrors the real implementation) */
export const ShipPickerScreenMock = {
  render(state, _props) {
    return renderShipPickerContent(state.currentShipId, state.campaignState);
  },

  bind(api, props) {
    const { onStateUpdate, onClose } = props;

    api.on('[data-action]', 'click', (e, el) => {
      e.stopPropagation();
      const action = el.dataset.action;

      switch (action) {
        case 'swap-to-ship': {
          const shipId = el.dataset.shipId;
          if (shipId && onStateUpdate) {
            onStateUpdate({ swappedTo: shipId });
          }
          break;
        }
        case 'swap-to-stored-ship': {
          const index = parseInt(el.dataset.storedShipIndex ?? '-1', 10);
          if (index >= 0 && onStateUpdate) {
            onStateUpdate({ swappedToStoredIndex: index });
          }
          break;
        }
        case 'unassign': {
          if (onStateUpdate) {
            onStateUpdate({ unassigned: true });
          }
          break;
        }
      }

      onClose?.();
    });
  },
};
