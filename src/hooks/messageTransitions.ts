import type { ChatMessage, ConversationParticipant } from '../api/client';
import type { ChatMessageItem, MessageStatus, ReadersState, WSMessageData, WSErrorData } from '../types/messages';
import { uuidV1Timestamp } from '../utils/uuid';
import { allOthersRead, applyMessageRead, deriveMessageStatus, maxWatermark } from '../utils/messageStatus';

/**
 * Pure message-array transforms for `useMessages`.
 *
 * Every frame event and the history-fetch pipeline boil down to "take the
 * current message array (or fetch inputs) → produce the next array". Those
 * transforms are pure here — no React, no refs, no network — so they're
 * unit-testable without renderHook and the hook itself reads as a thin
 * dispatch over them. Semantics must match the WS protocol exactly:
 * - receipt events are upgrade-only (a late/reordered frame never downgrades
 *   a 'read' message back to gray),
 * - an `undefined` clientMessageId must never match (the error-frame guard),
 * - optimistic temp-ids (NaN timeuuid) can never count as delivered/read.
 */

// ---- History fetch pipeline -------------------------------------------

/**
 * Which freshly-fetched incoming messages are genuinely new deliveries to ack.
 * Bounded by the inbox ack-watermark so a reconnect only acks what was missed;
 * re-acks are harmless — the consumer dedupes by (message, recipient).
 * Order-independent: the input is sorted internally by v1-timeuuid ascending,
 * so callers need not pre-reverse a newest-first history payload.
 */
export function messagesToAck(
  fetchedMessages: readonly ChatMessage[],
  currentUserId: string | null,
  maxAcked: number,
): { toAck: ChatMessage[]; maxAcked: number } {
  // Sort by v1-timeuuid so the monotonic watermark pass is a single sweep
  // regardless of the caller's ordering (NaN rows keep relative order — the
  // loop below skips them anyway).
  const sorted = [...fetchedMessages].sort(
    (a, b) => uuidV1Timestamp(a.id) - uuidV1Timestamp(b.id),
  );
  let nextMax = maxAcked;
  const toAck: ChatMessage[] = [];
  for (const message of sorted) {
    if (message.senderId === currentUserId || !message.id) continue;
    const ts = uuidV1Timestamp(message.id);
    if (Number.isNaN(ts) || ts <= nextMax) continue;
    toAck.push(message);
    nextMax = ts;
  }
  return { toAck, maxAcked: nextMax };
}

/** Shape fetched history rows into UI rows, hydrating sender email + status. */
export function deriveHistoryMessages(
  fetchedMessages: readonly ChatMessage[],
  participants: readonly ConversationParticipant[],
  currentUserId: string | null,
  readers: ReadersState | undefined,
): ChatMessageItem[] {
  return fetchedMessages.map((message) => {
    const senderParticipant = participants.find(
      (participant) => participant.userId === message.senderId,
    );
    const isMine = message.senderId === currentUserId;
    // History may echo clientMessageId + receipts from the store; the
    // `ChatMessage` client type predates the echo, so read them off a cast.
    const server = message as ChatMessageItem;
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderEmail: senderParticipant?.email,
      content: message.content,
      createdAt: message.createdAt,
      clientMessageId: server.clientMessageId,
      receipts: server.receipts,
      status: deriveMessageStatus(isMine, message.id, readers, server.receipts),
    };
  });
}

/**
 * Reconcile freshly-fetched history against what the UI already holds:
 * - messages already marked 'read' stay read (a re-fetch must never regress a
 *   blue tick back to gray — the live signal is the fresher source),
 * - a history message echoing a stuck optimistic row's clientMessageId adopts
 *   the server id + accurate status (a lost `message_sent` self-heals).
 */
export function mergeHistory(
  prevMessages: readonly ChatMessageItem[],
  historyMessages: readonly ChatMessageItem[],
): ChatMessageItem[] {
  const wasRead = new Set(
    prevMessages.filter((message) => message.status === 'read').map((message) => message.id),
  );
  const optimisticByClientId = new Set(
    prevMessages
      .filter(
        (message) =>
          (message.status === 'sending' || message.status === 'sent') &&
          message.clientMessageId,
      )
      .map((message) => message.clientMessageId),
  );
  const historyIds = new Set(historyMessages.map((message) => message.id));
  const historyClientIds = new Set(
    historyMessages
      .filter((message) => message.clientMessageId != null)
      .map((message) => message.clientMessageId),
  );

  // Fetched rows carry the server truth (plus wasRead / optimistic reconcile).
  const mergedHistory = historyMessages.map((message) => {
    if (message.clientMessageId != null && optimisticByClientId.has(message.clientMessageId)) {
      return message;
    }
    return wasRead.has(message.id) ? { ...message, status: 'read' as const } : message;
  });

  // Retain prev messages the fetch did NOT return — older messages the user
  // scrolled back to, and newer live messages that arrived after the fetch —
  // so a reconnect refetch never collapses the view to the newest window. Drop
  // only what the fetch supersedes (same id) or reconciles (same clientMessageId).
  const retained = prevMessages.filter((message) => {
    if (historyIds.has(message.id)) return false;
    if (message.clientMessageId != null && historyClientIds.has(message.clientMessageId)) {
      return false;
    }
    return true;
  });

  // Chronological union (stable sort keeps equal-timestamp order).
  return [...retained, ...mergedHistory].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}

/** Newest incoming message by v1-timeuuid timestamp (not array position). */
export function newestIncomingMessage(
  fetchedMessages: readonly ChatMessage[],
  currentUserId: string | null,
): ChatMessage | null {
  return fetchedMessages
    .filter((message) => message.senderId !== currentUserId && !!message.id)
    .reduce<ChatMessage | null>(
      (newest, message) =>
        !newest || uuidV1Timestamp(message.id) > uuidV1Timestamp(newest.id) ? message : newest,
      null,
    );
}

// ---- Live WS frame transitions ----------------------------------------

/**
 * `message_sent` (sender ACK): advance the optimistic row 'sending' → 'sent',
 * adopting the server id — or straight to 'read' if a read receipt arrived
 * while it was still optimistic (ALL other readers cover it).
 */
export function applySentAck(
  messages: readonly ChatMessageItem[],
  payload: WSMessageData,
  readers: ReadersState | undefined,
): ChatMessageItem[] {
  // File invariant (see header): an `undefined` clientMessageId must never
  // match. Without this guard a message_sent frame lacking one would match
  // EVERY row with an undefined clientMessageId (all history rows) and
  // downgrade their 'delivered'/'read' statuses back to 'sent'.
  if (payload.clientMessageId == null) return messages as ChatMessageItem[];
  return messages.map((message) => {
    if (payload.clientMessageId == null || message.clientMessageId !== payload.clientMessageId) {
      return message;
    }
    const serverId = payload.messageId || message.id;
    const ts = uuidV1Timestamp(serverId);
    const status: MessageStatus =
      !Number.isNaN(ts) && maxWatermark(readers) >= ts && allOthersRead(readers, serverId)
        ? 'read'
        : 'sent';
    return { ...message, id: serverId, status };
  });
}

/**
 * `message_delivered`: upgrade MY outgoing 'sending'/'sent' row to 'delivered'
 * (gray ✓✓). Match by messageId (Kafka mode) OR clientMessageId (direct
 * fallback where the optimistic row has no server id yet). Upgrade-only — a
 * late or reordered receipt must never downgrade an already-read message.
 */
export function applyDeliveredAck(
  messages: readonly ChatMessageItem[],
  payload: WSMessageData,
  currentUserId: string | null,
): ChatMessageItem[] {
  return messages.map((message) => {
    if (message.senderId !== currentUserId) return message;
    const isTarget =
      (payload.messageId && message.id === payload.messageId) ||
      (payload.clientMessageId && message.clientMessageId === payload.clientMessageId);
    if (isTarget && (message.status === 'sending' || message.status === 'sent')) {
      return { ...message, status: 'delivered' as const };
    }
    return message;
  });
}

/**
 * `message_received`: append an incoming message; dedup on gateway resends.
 * `now` carries the caller's PRE-computed fallback id/createdAt — generating
 * them here would make the caller's setState updater impure (StrictMode
 * double-invokes updaters, and the two values would drift apart).
 */
export function applyIncoming(
  messages: readonly ChatMessageItem[],
  payload: WSMessageData,
  senderEmail: string | undefined,
  now: { id: string; createdAt: string },
): ChatMessageItem[] {
  // Dup: return the caller's array unchanged (same reference, cast for the
  // readonly param — the array itself is the caller's mutable state array).
  if (messages.some((message) => message.id === payload.messageId)) {
    return messages as ChatMessageItem[];
  }
  return [
    ...messages,
    {
      id: payload.messageId ?? now.id,
      conversationId: payload.conversationId,
      senderId: payload.senderId || '',
      senderEmail,
      content: payload.content,
      createdAt: payload.createdAt ?? now.createdAt,
      status: 'delivered',
    },
  ];
}

/**
 * The `message_read` readers bookkeeping: fold a reader's new watermark into
 * the existing per-conversation readers state, or seed a fresh one when no
 * history fetch has hydrated readers yet. Pure — the caller stores the result
 * in its ref.
 */
export function nextReadersState(
  prevReaders: ReadersState | undefined,
  readerId: string,
  watermarkTs: number,
): ReadersState {
  return prevReaders
    ? applyMessageRead(prevReaders, readerId, watermarkTs)
    : { watermark: { [readerId]: watermarkTs }, otherUserIds: [] as string[] };
}

/**
 * `message_read`: mark MY outgoing messages blue only when EVERY other
 * participant has read them (WhatsApp all-read: 1:1 = the other reader,
 * groups = everyone). Rows that were never delivered (local temp-ids) can't
 * have been read by anyone and are skipped. The watermark aggregation that
 * produces `readers` lives in the hook (it touches a ref) — this transform
 * only needs the result.
 */
export function applyRead(
  messages: readonly ChatMessageItem[],
  readers: ReadersState,
  currentUserId: string | null,
): ChatMessageItem[] {
  return messages.map((message) => {
    if (message.senderId !== currentUserId) return message;
    // Skip rows that were never delivered (their ids are local temp-ids).
    if (message.status === 'sending' || message.status === 'failed') return message;
    // ALL-read: blue only when every other participant covers this message.
    if (!allOthersRead(readers, message.id)) return message;
    return { ...message, status: 'read' as const };
  });
}

/**
 * `error`: fail the specific optimistic row. Only a frame that names a
 * clientMessageId can fail one — a frame without one must leave the array
 * untouched, otherwise `undefined === undefined` would match every row.
 */
export function applyError(
  messages: readonly ChatMessageItem[],
  payload: WSErrorData,
): ChatMessageItem[] {
  // No named row → leave the array untouched (same reference, cast as above).
  if (!payload.clientMessageId) return messages as ChatMessageItem[];
  return messages.map((message) =>
    message.clientMessageId === payload.clientMessageId
      ? { ...message, status: 'failed' as const }
      : message,
  );
}
