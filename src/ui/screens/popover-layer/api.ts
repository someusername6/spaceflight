/**
 * Popover Layer Public API
 *
 * Creates a simplified control interface for external popover management.
 */

import type { CampaignState } from '../../../campaign/types';
import { adjustForOverflow, calculateInitialPosition } from './positioning';
import { renderPopoverContent } from './render-helpers';
import type { PopoverContent, PopoverLayerState } from './types';

/** Generate unique ID for popover instance */
let popoverIdCounter = 0;
function generateId(): string {
  return `popover-${++popoverIdCounter}`;
}

export interface PopoverLayerAPI {
  show(content: PopoverContent, triggerRect: DOMRect, pin?: boolean): void;
  close(): void;
  isOpen(): boolean;
}

/**
 * Create a control API for the popover layer.
 * This is called after mounting the screen to get a simpler interface.
 */
export function createPopoverLayerAPI(
  handle: {
    setState: (partial: Partial<PopoverLayerState>) => void;
    getState: () => PopoverLayerState;
  },
  getCampaignState: () => CampaignState,
): PopoverLayerAPI {
  return {
    show(content, triggerRect, pin = false) {
      const campState = getCampaignState();

      // Determine type class for accurate CSS sizing
      const isSecondary =
        content.type === 'secondary' ||
        (content.type === 'swap' && content.slotType === 'secondary') ||
        (content.type === 'empty' && content.slotType === 'secondary');
      const typeClass = isSecondary
        ? 'weapon-popover-secondary'
        : 'weapon-popover-primary';
      const pickerClass =
        content.type === 'empty' || content.type === 'swap'
          ? ' picker-content'
          : '';

      // Create temporary element to measure popover size
      const tempDiv = document.createElement('div');
      tempDiv.className = `weapon-popover ${typeClass}`;
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.position = 'fixed';
      tempDiv.innerHTML = `<div class="popover-content${pickerClass}">${renderPopoverContent(content, campState)}</div>`;
      document.body.appendChild(tempDiv);
      const popoverRect = tempDiv.getBoundingClientRect();
      document.body.removeChild(tempDiv);

      const initialPos = calculateInitialPosition(triggerRect);
      const position = adjustForOverflow(
        initialPos,
        { width: popoverRect.width, height: popoverRect.height },
        triggerRect,
        window.innerWidth,
        window.innerHeight,
      );

      handle.setState({
        main: {
          id: generateId(),
          content,
          position,
          visibility: pin ? 'pinned' : 'hover',
          triggerRect,
        },
        submenu: null,
        campaignState: campState,
      });
    },

    close() {
      handle.setState({
        main: null,
        submenu: null,
        closeTimeoutId: null,
        isMouseOverPopover: false,
      });
    },

    isOpen() {
      return handle.getState().main !== null;
    },
  };
}
