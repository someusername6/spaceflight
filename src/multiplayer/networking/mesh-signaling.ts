/**
 * Mesh Signaling Handlers - WebRTC signal processing for mesh connections.
 *
 * Handles offer/answer/ICE candidate signals for establishing peer connections.
 */

import {
  type OutgoingSignal,
  type PeerState,
  processBufferedIceCandidates,
} from './peer-connection';

/**
 * Handle an incoming SDP offer from a remote peer.
 * Creates an answer and returns the signal to send back.
 */
export async function handleOffer(
  fromPeerId: string,
  state: PeerState,
  data: string,
): Promise<OutgoingSignal> {
  const offer = JSON.parse(data) as RTCSessionDescriptionInit;
  await state.connection.setRemoteDescription(offer);
  state.remoteDescriptionSet = true;

  await processBufferedIceCandidates(state);

  const answer = await state.connection.createAnswer();
  await state.connection.setLocalDescription(answer);

  return {
    toPeerId: fromPeerId,
    type: 'answer',
    data: JSON.stringify(answer),
  };
}

/**
 * Handle an incoming SDP answer from a remote peer.
 */
export async function handleAnswer(
  state: PeerState,
  data: string,
): Promise<void> {
  const answer = JSON.parse(data) as RTCSessionDescriptionInit;
  await state.connection.setRemoteDescription(answer);
  state.remoteDescriptionSet = true;

  await processBufferedIceCandidates(state);
}

/**
 * Handle an incoming ICE candidate from a remote peer.
 * Buffers candidates if remote description isn't set yet.
 */
export async function handleIceCandidate(
  state: PeerState,
  data: string,
): Promise<void> {
  const candidate = JSON.parse(data) as RTCIceCandidateInit;
  const iceCandidate = new RTCIceCandidate(candidate);

  if (state.remoteDescriptionSet) {
    await state.connection.addIceCandidate(iceCandidate);
  } else {
    state.iceCandidateBuffer.push(iceCandidate);
  }
}
