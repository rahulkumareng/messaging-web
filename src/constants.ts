/**
 * App-wide protocol constants, kept out of components/hooks so the wire
 * contract (event names, statuses, limits) lives in exactly one place and the
 * values can't drift between the sender and the frame handlers.
 */

/** WebSocket event names shared by the client (this app) and the server frames. */
export const WS_EVENT = {
  /** Client→server: send a message. */
  Message: 'message',
  /** Server→client: the sender's single-tick ack (broker ACK received). */
  MessageSent: 'message_sent',
  /** Both directions: delivery ack (client→server + server broadcast). */
  MessageDelivered: 'message_delivered',
  /** Server→client: an incoming message for this user. */
  MessageReceived: 'message_received',
  /** Both directions: read watermark (client→server + server broadcast). */
  MarkRead: 'mark_read',
  MessageRead: 'message_read',
  /** Server→client: rejection / failure frame. */
  Error: 'error',
} as const;

/** Client-side cap on outbound message length (mirrors the server's MAX_MESSAGE_LENGTH). */
export const MAX_MESSAGE_LENGTH = 4000;

/** Number of messages fetched when opening a conversation (server caps at MAX_HISTORY_LIMIT). */
export const HISTORY_FETCH_LIMIT = 20;

/** Per-conversation latest-message backfill for the sidebar preview. */
export const PREVIEW_FETCH_LIMIT = 1;
