/**
 * Test utilities for signaling server tests.
 */

const BASE_URL = process.env.SIGNALING_URL || 'http://localhost:3001';

/**
 * Make an HTTP request to the signaling server.
 */
export async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

/**
 * Create a room.
 */
export async function createRoom(gameVersion = '0.2.11') {
  return request('POST', '/rooms', {
    body: { gameVersion },
  });
}

/**
 * Join a room.
 */
export async function joinRoom(code, gameVersion = '0.2.11') {
  return request('POST', `/rooms/${code}/join`, {
    body: { gameVersion },
  });
}

/**
 * Leave a room.
 */
export async function leaveRoom(code, token) {
  return request('POST', `/rooms/${code}/leave`, { token });
}

/**
 * Delete a room.
 */
export async function deleteRoom(code, token) {
  return request('DELETE', `/rooms/${code}`, { token });
}

/**
 * Post a signal.
 */
export async function postSignal(code, token, targetPeerId, type, data) {
  return request('POST', `/rooms/${code}/signals`, {
    token,
    body: { targetPeerId, type, data },
  });
}

/**
 * Get signals.
 */
export async function getSignals(code, token, since) {
  const path = since
    ? `/rooms/${code}/signals?since=${since}`
    : `/rooms/${code}/signals`;
  return request('GET', path, { token });
}

/**
 * Get events.
 */
export async function getEvents(code, token, since) {
  const path = since
    ? `/rooms/${code}/events?since=${since}`
    : `/rooms/${code}/events`;
  return request('GET', path, { token });
}

/**
 * Kick a player.
 */
export async function kick(code, token, peerId) {
  return request('POST', `/rooms/${code}/kick`, {
    token,
    body: { peerId },
  });
}

/**
 * Set room state.
 */
export async function setState(code, token, state) {
  return request('POST', `/rooms/${code}/state`, {
    token,
    body: { state },
  });
}

/**
 * Check if the signaling server is running.
 */
export async function checkServerRunning() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
