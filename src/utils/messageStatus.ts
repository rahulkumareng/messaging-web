/**
 * Pure derivation of a message's displayed receipt status (sent / delivered /
 * read) from per-reader read watermarks and per-message receipts. React-free
 * so the trickiest logic in the app is unit-testable without renderHook.
 *
 * The model follows WhatsApp: an outgoing message is "read" (blue) only when
 * EVERY other participant's read watermark covers it (all-read for groups,
 * single-reader for 1:1); otherwise "delivered" when ≥1 recipient has a
 * receipt row; otherwise "sent".
 */
import type { MessageReceipt, MessageStatus, ReadersState } from '../types/messages';
import { uuidV1Timestamp } from './uuid';

/** True when every other participant's read watermark covers this message. */
export function allOthersRead(state: ReadersState | undefined, messageId: string): boolean {
  if (!state || state.otherUserIds.length === 0) return false;
  const ts = uuidV1Timestamp(messageId);
  if (Number.isNaN(ts)) return false; // local optimistic id — no one can have read it
  return state.otherUserIds.every((userId) => (state.watermark[userId] ?? 0) >= ts);
}

/**
 * Build/refresh a conversation's readers from each participant's persisted read
 * watermark. `existing` is unioned monotonically so live `message_read` advances
 * recorded on a prior fetch are never regressed by a stale participants payload.
 */
export function readersFromParticipants(
  participants: { userId: string; lastReadMessageId?: string | null }[],
  myId: string | null,
  existing?: ReadersState,
): ReadersState {
  const state: ReadersState = {
    watermark: { ...(existing?.watermark ?? {}) },
    otherUserIds: participants.filter((participant) => participant.userId !== myId).map((participant) => participant.userId),
  };
  for (const participant of participants) {
    if (!participant.lastReadMessageId) continue;
    const ts = uuidV1Timestamp(participant.lastReadMessageId);
    if (!Number.isNaN(ts)) {
      state.watermark[participant.userId] = Math.max(state.watermark[participant.userId] ?? 0, ts);
    }
  }
  return state;
}

/** Advance one reader's watermark (never regresses). Returns a new state. */
export function applyMessageRead(
  state: ReadersState,
  readerId: string,
  watermarkTs: number,
): ReadersState {
  // A NaN watermark (malformed/v4 lastReadMessageId) would be sticky here:
  // Math.max(NaN, ts) stays NaN forever, so this reader could never count as
  // read again. Mirror the guard in readersFromParticipants and bail instead.
  if (Number.isNaN(watermarkTs)) return state;
  return {
    ...state,
    watermark: {
      ...state.watermark,
      [readerId]: Math.max(state.watermark[readerId] ?? 0, watermarkTs),
    },
  };
}

/** Highest read watermark across all readers (drives the pending-read gate). */
export function maxWatermark(state: ReadersState | undefined): number {
  let max = 0;
  if (!state) return max;
  for (const ts of Object.values(state.watermark)) {
    if (ts > max) max = ts;
  }
  return max;
}

/**
 * Derive a message's displayed status.
 * read (all others read) > delivered (≥1 receipt row) > sent. Incoming messages
 * are always 'delivered' (their own read state is tracked via the watermark,
 * not the per-message status).
 */
export function deriveMessageStatus(
  isMine: boolean,
  messageId: string,
  readers: ReadersState | undefined,
  receipts?: MessageReceipt[],
): MessageStatus {
  if (!isMine) return 'delivered';
  if (allOthersRead(readers, messageId)) return 'read';
  if ((receipts ?? []).some((receipt) => receipt.status === 'delivered' || receipt.status === 'read')) {
    return 'delivered';
  }
  return 'sent';
}
