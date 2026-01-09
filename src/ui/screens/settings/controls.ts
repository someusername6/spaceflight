/**
 * Settings Controls Tab - Key binding rendering for the settings screen.
 */

import {
  ACTION_CATEGORIES,
  ACTION_DISPLAY_NAMES,
  DEFAULT_BINDINGS,
  type GameAction,
  getKeyBindings,
  getKeyDisplayName,
} from '../../../input/key-bindings';

/** Render a single key binding row */
function renderBindingRow(
  action: GameAction,
  listeningAction: GameAction | null,
): string {
  const bindings = getKeyBindings();
  const currentKey = bindings[action];
  const displayName = ACTION_DISPLAY_NAMES[action];
  const keyLabel = getKeyDisplayName(currentKey);
  const isListening = listeningAction === action;
  const isDefault = currentKey === DEFAULT_BINDINGS[action];

  return `
    <div class="binding-row" data-action="${action}">
      <span class="binding-label">${displayName}</span>
      <div class="binding-controls">
        <button
          class="btn btn-small binding-key ${isListening ? 'listening' : ''}"
          data-action="${action}"
          aria-label="Rebind ${displayName}"
        >
          ${isListening ? 'Press a key...' : keyLabel}
        </button>
        ${
          !isDefault
            ? `<button class="btn btn-small btn-reset-key" data-action="${action}" title="Reset to default">
                 <span class="reset-icon">&#8634;</span>
               </button>`
            : ''
        }
      </div>
    </div>
  `;
}

/** Render a category section */
function renderCategory(
  name: string,
  actions: GameAction[],
  listeningAction: GameAction | null,
): string {
  return `
    <div class="settings-category">
      <h3 class="category-header">${name}</h3>
      <div class="category-bindings">
        ${actions.map((action) => renderBindingRow(action, listeningAction)).join('')}
      </div>
    </div>
  `;
}

/** Render the controls tab content */
export function renderControlsTab(listeningAction: GameAction | null): string {
  const categories = Object.entries(ACTION_CATEGORIES)
    .map(([name, actions]) => renderCategory(name, actions, listeningAction))
    .join('');

  return `
    <div class="settings-tab-content">
      <div class="settings-tab-header">
        <button class="btn btn-small" id="btn-reset-all">
          Reset All to Defaults
        </button>
      </div>
      <div class="bindings-list">
        ${categories}
      </div>
    </div>
  `;
}
