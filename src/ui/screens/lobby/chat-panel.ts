/**
 * Chat Panel - Render chat messages and input in lobby.
 *
 * Features:
 * - Message list with auto-scroll
 * - System messages styled differently
 * - Input field with send button
 */

import type { ChatEntry } from '../../../multiplayer/lobby-state';
import { escapeHtml } from '../../utils';

/** Format timestamp for display */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Render a single chat message */
export function renderChatMessage(entry: ChatEntry): string {
  if (entry.type === 'system') {
    return `
      <div class="chat-message system">
        <span class="chat-time">${formatTimestamp(entry.timestamp)}</span>
        <span class="chat-text">${escapeHtml(entry.text)}</span>
      </div>
    `;
  }

  return `
    <div class="chat-message">
      <span class="chat-time">${formatTimestamp(entry.timestamp)}</span>
      <span class="chat-sender">${escapeHtml(entry.fromCallsign ?? 'Unknown')}:</span>
      <span class="chat-text">${escapeHtml(entry.text)}</span>
    </div>
  `;
}

/** Render the full chat panel */
export function renderChatPanel(messages: ChatEntry[]): string {
  const messageHtml = messages.map(renderChatMessage).join('');

  return `
    <div class="chat-panel">
      <div class="panel-header">
        <h3>Chat</h3>
      </div>
      <div class="chat-messages" id="chat-messages">
        ${messageHtml || '<div class="chat-empty">No messages yet</div>'}
      </div>
      <form class="chat-input-form" id="chat-form">
        <input
          type="text"
          id="chat-input"
          class="chat-input"
          placeholder="Type a message..."
          maxlength="200"
          autocomplete="off"
        />
        <button type="submit" class="btn btn-sm" id="btn-send">Send</button>
      </form>
    </div>
  `;
}

/** Scroll chat messages to bottom */
export function scrollChatToBottom(): void {
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}
