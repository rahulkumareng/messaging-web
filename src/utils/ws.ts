/**
 * Pure shaping helpers for the WebSocket message protocol: building the local
 * optimistic row for a send, and narrowing incoming frames. No React, no state.
 */
import type { ChatMessageItem } from '../types/messages';

let clientMessageIdCounter = 0;

/** Client-generated id correlating an optimistic row to its server echo.
 * crypto.randomUUID makes same-ms collisions practically impossible; the
 * fallback chains a monotonic counter so rapid sends can never collide either.
 * The 'temp-' prefix is load-bearing: callers rely on it being excluded from
 * v1-timeuuid parsing (NaN), so a temp id can never be treated as a read
 * watermark. */
export function newClientMessageId(): string {
  const ts = Date.now().toString(36);
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${clientMessageIdCounter++}-${Math.random().toString(36).slice(2, 10)}`;
  return `temp-${ts}-${rand}`;
}

/** The local row shown the instant the user hits send, before any server ack. */
export function createOptimisticMessage(opts: {
  conversationId: string;
  content: string;
  clientMessageId: string;
  senderId: string;
  senderEmail?: string;
}): ChatMessageItem {
  return {
    id: opts.clientMessageId,
    clientMessageId: opts.clientMessageId,
    conversationId: opts.conversationId,
    senderId: opts.senderId,
    senderEmail: opts.senderEmail,
    content: opts.content,
    createdAt: new Date().toISOString(),
    status: 'sending',
  };
}
