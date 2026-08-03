/**
 * Shared domain types for the message / receipt wire protocol. Promoted here
 * because they're consumed by 2+ modules (hooks, components, pages); anything
 * used in exactly one module stays colocated with that module.
 */
import { WS_EVENT } from '../constants';

/** Lifecycle of an outgoing message as displayed to its sender. */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/** A per-message delivery/read receipt row, hydrated from `messages_history`. */
export interface MessageReceipt {
  userId: string;
  status: 'delivered' | 'read';
}

/** One frame's payload, as broadcast by the server / sent by this client. */
export interface WSMessageData {
  messageId?: string;
  conversationId: string;
  senderId?: string;
  content: string;
  createdAt?: string;
  clientMessageId?: string;
  status?: MessageStatus;
  // delivered/read receipt fields
  recipientId?: string;
  deliveredAt?: string;
  lastReadMessageId?: string;
  readerId?: string;
  readAt?: string;
  deliveredCount?: number;
}

/** Server-sent error frame payload. */
export interface WSErrorData {
  code?: string;
  message?: string;
  clientMessageId?: string;
  conversationId?: string;
}

/** Discriminated WS frame: the `event` literal narrows `data` to one shape,
 * so frame handlers never need `as` casts. */
export type WSFrame =
  | { event: typeof WS_EVENT.MessageSent; data: WSMessageData }
  | { event: typeof WS_EVENT.MessageDelivered; data: WSMessageData }
  | { event: typeof WS_EVENT.MessageReceived; data: WSMessageData }
  | { event: typeof WS_EVENT.MessageRead; data: WSMessageData }
  | { event: typeof WS_EVENT.Error; data: WSErrorData };

/** A message as the UI renders it (extends the wire shape with sender + receipt state). */
export interface ChatMessageItem extends WSMessageData {
  id: string;
  senderEmail?: string;
  /** Recipients with a delivered/read receipt row for this message (reload hydration). */
  receipts?: MessageReceipt[];
}

/** Per-reader read watermarks for a conversation — drives the ALL-read decision. */
export interface ReadersState {
  /** userId → highest v1-timeuuid timestamp that user has read. */
  watermark: Record<string, number>;
  /** The other participants (everyone but me); ALL of them must read for blue. */
  otherUserIds: string[];
}

/** Exhaustive-switch guard: makes a missed case a compile error, never a silent fall-through. */
export function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${String(x)}`);
}
