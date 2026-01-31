/**
 * Chat Footer - Compact chat component for debrief screen.
 *
 * Features:
 * - Smaller height than full chat panel (100px)
 * - Inline layout with input field
 * - Reuses chat message rendering from chat-panel.ts
 */

import type { ChatEntry } from '../../../multiplayer/lobby-state';
import { renderChatMessage } from '../lobby/chat-panel';

/** Props for the chat footer component */
export interface ChatFooterProps {
  messages: ChatEntry[];
  onSendChat: (text: string) => void;
}

/**
 * Render the compact chat footer for multiplayer debrief.
 */
export function renderChatFooter(messages: ChatEntry[]): string {
  const messageHtml = messages.map(renderChatMessage).join('');

  return `
    <div class="chat-footer">
      <div class="chat-footer-messages" id="chat-footer-messages">
        ${messageHtml || '<div class="chat-empty">No messages yet</div>'}
      </div>
      <form class="chat-footer-form" id="chat-footer-form">
        <input
          type="text"
          id="chat-footer-input"
          class="chat-input"
          placeholder="Type a message..."
          maxlength="200"
          autocomplete="off"
        />
        <button type="submit" class="btn btn-sm" id="btn-chat-send">Send</button>
      </form>
    </div>
  `;
}

/** Scroll chat footer messages to bottom */
export function scrollChatFooterToBottom(): void {
  const chatMessages = document.getElementById('chat-footer-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}
