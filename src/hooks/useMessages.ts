import { useEffect, useRef, useState, useCallback } from 'react';
import type { Conversation, ConversationParticipant } from '../api/client';
import { messagesApi } from '../api/client';
import type { ChatMessageItem, ReadersState, WSFrame } from '../types/messages';
import { HISTORY_FETCH_LIMIT, WS_EVENT } from '../constants';
import { uuidV1Timestamp } from '../utils/uuid';
import { readersFromParticipants } from '../utils/messageStatus';
import {
  applyDeliveredAck,
  applyError,
  applyIncoming,
  applyRead,
  applySentAck,
  deriveHistoryMessages,
  mergeHistory,
  messagesToAck,
  newestIncomingMessage,
  nextReadersState,
} from './messageTransitions';

/**
 * Owns the per-conversation message map for the chat shell.
 *
 * History is fetched on conversation switch / socket (re)connect (last
 * HISTORY_FETCH_LIMIT messages; read watermarks are hydrated from each
 * participant's `lastReadMessageId`, and delivery of fetched incoming messages
 * is acked so offline→reconnect counts as real delivery — the inbox). Live
 * frames from `useChatSocket` mutate the same map: `message_sent` advances
 * optimistic temps to 'sent', `message_delivered` upgrades to 'delivered',
 * `message_received` appends incoming messages, `message_read` paints blue
 * ticks when EVERY other participant has read (WhatsApp all-read), and server
 * `error` events mark the matching optimistic row as failed.
 *
 * The hook owns the map, the receipt-side refs, and the IO (fetch, socket,
 * refs). Every pure array transform lives in `messageTransitions` (same
 * folder) so the state logic is unit-testable without renderHook.
 */
export function useMessages(
  activeConversation: Conversation | null,
  currentUserId: string | null,
  socket: {
    // WSFrame is a discriminated union on `event` — the frame-handling effect
    // below narrows `data` purely from the event comparison (no casts).
    incomingMessage: WSFrame | null;
    markAsRead: (conversationId: string, messageId: string) => void;
    sendMessageDelivered: (conversationId: string, messageId: string) => void;
    isConnected?: boolean;
  },
  /** Fallback resolver for sender email when the active conversation is unknown. */
  participantsLookup?: (userId: string) => ConversationParticipant | undefined,
  /** Called when a server `error` frame carries a human-readable message. */
  onError?: (message: string) => void,
  /** Fired in lockstep with every local `markAsRead` — lets the caller advance
   * its own read watermark (e.g. clear the sidebar unread dot) immediately. */
  onMarkRead?: (conversationId: string, messageId: string) => void,
) {
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessageItem[]>>({});

  const { incomingMessage, markAsRead, sendMessageDelivered, isConnected } = socket;

  // Latest-value refs so the effects below fire on a narrow trigger
  // (conversation-id change / incoming frame / connection change) while still
  // reading the freshest participants — without re-firing on every refresh.
  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;
  const participantsLookupRef = useRef(participantsLookup);
  participantsLookupRef.current = participantsLookup;

  // Per-conversation per-reader read watermarks (drives the ALL-read decision),
  // and the inbox delivery-ack watermark (bounds the ack-on-history-fetch so a
  // reconnect only acks genuinely-new messages; re-acks are harmless — the
  // consumer dedupes by (message, recipient)).
  const readersRef = useRef<Record<string, ReadersState>>({});
  const ackedDeliveryRef = useRef<Record<string, number>>({});

  // History fetch on conversation switch / socket (re)connect — the inbox
  // backfill. Skips while disconnected; runs on reconnect to pull what was missed.
  useEffect(() => {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    if (!isConnected) return;

    const conversationId = conversation.id;
    // Unmount guard: the fetch may resolve after this effect was torn down
    // (conversation switch / socket drop). React 18 no-ops the setState, but
    // the ack fan-out and markAsRead below would still fire for a stale view.
    let cancelled = false;
    messagesApi
      .fetchMessages(conversationId, HISTORY_FETCH_LIMIT)
      .then((res) => {
        if (cancelled) return;
        const fetchedMessages = res.data.messages || [];

        // Backend history is newest-first (Cassandra clusters created_at DESC);
        // the message map is chronological (oldest → newest) so live frames
        // append at the end and the thread renders top→bottom.
        fetchedMessages.reverse();

        // Inbox: ack delivery of the incoming messages this fetch delivered to
        // the app. A backfilled (offline → reconnect) message counts as
        // "delivered" the moment the app processes it — the sender's gray ✓✓
        // fires on real app-level receipt, not the old reload-default.
        const { toAck, maxAcked } = messagesToAck(
          fetchedMessages,
          currentUserId,
          ackedDeliveryRef.current[conversationId] ?? 0,
        );
        for (const message of toAck) {
          sendMessageDelivered(conversationId, message.id);
        }
        ackedDeliveryRef.current[conversationId] = maxAcked;

        // Seed readers from each participant's persisted watermark, unioned
        // monotonically so live `message_read` advances are never regressed.
        const readers = readersFromParticipants(
          conversation.participants,
          currentUserId,
          readersRef.current[conversationId],
        );
        readersRef.current[conversationId] = readers;

        const historyMessages = deriveHistoryMessages(
          fetchedMessages,
          conversation.participants,
          currentUserId,
          readers,
        );
        setMessagesMap((prev) => ({
          ...prev,
          [conversationId]: mergeHistory(prev[conversationId] ?? [], historyMessages),
        }));

        // Opening a conversation means the reader has seen its messages, so
        // advance my read watermark to the newest incoming one (re-marks are
        // no-ops — the gateway's monotonic guard suppresses stale receipts).
        const newestIncoming = newestIncomingMessage(fetchedMessages, currentUserId);
        if (newestIncoming) {
          markAsRead(conversationId, newestIncoming.id);
          // Mirror the read into the caller's local watermark so the unread dot
          // clears immediately even when the map was empty (first-open case).
          onMarkRead?.(conversationId, newestIncoming.id);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch message history:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConversation?.id, currentUserId, markAsRead, sendMessageDelivered, isConnected, onMarkRead]);

  // Live WS frame handling — a thin dispatch over the pure transitions in
  // `messageTransitions`; the refs/IO below stay here.
  useEffect(() => {
    if (!incomingMessage) return;

    const { event, data } = incomingMessage;

    // Every branch shares one shape — "run a pure transition over one
    // conversation's array and commit it" — so the plumbing lives here once.
    const update = (
      conversationId: string,
      transform: (messages: ChatMessageItem[]) => ChatMessageItem[],
    ) =>
      setMessagesMap((prev) => {
        const next = transform(prev[conversationId] || []);
        // A transition that returns the SAME reference (no-op / dedup) means
        // nothing changed — bail out so React skips the redundant re-render.
        if (next === (prev[conversationId] || [])) return prev;
        return { ...prev, [conversationId]: next };
      });

    if (event === WS_EVENT.MessageSent) {
      // Sender ACK: update the optimistic row from 'sending' → 'sent' (or 'read'
      // if a read receipt arrived while it was still optimistic).
      const payload = data;
      update(payload.conversationId, (messages) =>
        applySentAck(messages, payload, readersRef.current[payload.conversationId]),
      );
    } else if (event === WS_EVENT.MessageDelivered) {
      // Delivery receipt: upgrade MY outgoing message from 'sending'/'sent' to
      // 'delivered' (gray ✓✓). Upgrade-only — never downgrades 'read'.
      const payload = data;
      update(payload.conversationId, (messages) =>
        applyDeliveredAck(messages, payload, currentUserId),
      );
    } else if (event === WS_EVENT.MessageReceived) {
      // Incoming message from another user — append + acknowledge delivery.
      const payload = data;
      const conversation = activeConversationRef.current;
      const lookup = participantsLookupRef.current;
      // Look up sender email across all known participants. If the sender
      // isn't in any conversation we know about (rare — usually means we
      // joined the WS before /conversations resolved), the row simply omits
      // the email.
      const senderParticipant: ConversationParticipant | undefined = payload.senderId
        ? conversation?.participants.find(
            (participant) => participant.userId === payload.senderId,
          ) ?? lookup?.(payload.senderId)
        : undefined;
      // Pre-compute the fallback row identity OUTSIDE the setState updater so
      // the updater stays pure (StrictMode double-invokes updaters, and
      // Date.now() inside would desync the id/createdAt pair between runs).
      const now = { id: `msg-${Date.now()}`, createdAt: new Date().toISOString() };
      // Append the incoming message, deduping on gateway resends. If the
      // transition returns the SAME array reference (a duplicate frame), skip
      // the commit so React bails out of the redundant re-render.
      setMessagesMap((prev) => {
        const existing = prev[payload.conversationId] || [];
        const next = applyIncoming(existing, payload, senderParticipant?.email, now);
        if (next === existing) return prev;
        return { ...prev, [payload.conversationId]: next };
      });

      // Ack only genuinely incoming frames — a message_received for my OWN
      // message (echoed to another device by the sender fan-out) is not a
      // foreign delivery: acking it would create a spurious self-receipt and
      // auto-reading it would advance my own watermark from my own message.
      if (payload.senderId === currentUserId) {
        return;
      }

      // Acknowledge delivery (app processed the frame) and advance the inbox
      // ack-watermark so a later history fetch doesn't re-ack it.
      if (payload.messageId) {
        const ts = uuidV1Timestamp(payload.messageId);
        if (!Number.isNaN(ts) && ts > (ackedDeliveryRef.current[payload.conversationId] ?? 0)) {
          ackedDeliveryRef.current[payload.conversationId] = ts;
        }
        sendMessageDelivered(payload.conversationId, payload.messageId);
      }

      // If this conversation is currently open, auto mark as read.
      if (conversation?.id === payload.conversationId && payload.messageId) {
        markAsRead(payload.conversationId, payload.messageId);
        // Keep the local unread watermark in sync so the sidebar dot clears
        // even when the read happens via a live frame (not a re-click).
        onMarkRead?.(payload.conversationId, payload.messageId);
      }
    } else if (event === WS_EVENT.MessageRead) {
      // Blue tick: a reader read up to lastReadMessageId. Track the reader's
      // watermark so the ALL-read decision aggregates across readers, and mark
      // MY outgoing messages blue only when EVERY other participant has read
      // them (WhatsApp semantics: 1:1 = the other reader, groups = everyone).
      const payload = data;
      if (!payload.lastReadMessageId || !payload.readerId) return;
      const watermarkTs = uuidV1Timestamp(payload.lastReadMessageId);
      const conversationId = payload.conversationId;
      // If no readers state exists yet (a message_read racing the first history
      // fetch), seed it from the active conversation's participants so the
      // ALL-read decision has the recipient set — otherwise nextReadersState
      // would seed empty otherUserIds and this frame could never blue-ify.
      if (!readersRef.current[conversationId]) {
        const conversation = activeConversationRef.current;
        if (conversation?.id === conversationId) {
          readersRef.current[conversationId] = readersFromParticipants(
            conversation.participants,
            currentUserId,
          );
        }
      }
      const readers = nextReadersState(
        readersRef.current[conversationId],
        payload.readerId,
        watermarkTs,
      );
      readersRef.current[conversationId] = readers;

      update(conversationId, (messages) => applyRead(messages, readers, currentUserId));
    } else if (event === WS_EVENT.Error) {
      // Server rejection: FORBIDDEN / PERSIST_FAILED. Only a frame that names a
      // specific optimistic row (clientMessageId) can fail one; a frame without
      // one (mark_read / fetch / delivery are fire-and-forget) must leave the
      // map untouched — otherwise `undefined === undefined` would match every
      // received/history row and flip the whole conversation to 'failed'.
      const errData = data;
      setMessagesMap((prev) => {
        if (!errData.conversationId || !prev[errData.conversationId]) return prev;
        return {
          ...prev,
          [errData.conversationId]: applyError(prev[errData.conversationId], errData),
        };
      });

      if (errData.message && onError) {
        onError(errData.message);
      }
    }
  }, [incomingMessage, currentUserId, markAsRead, sendMessageDelivered, onError, onMarkRead]);

  // Optimistic send — called by ChatPage when ChatView emits. The WS gateway
  // will fan out the matching `message_sent` frame to land this row at 'sent'.
  const appendOptimistic = useCallback(
    (conversationId: string, message: ChatMessageItem) => {
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), message],
      }));
    },
    [],
  );

  // Flip a specific optimistic row to 'failed' — used when the send never made
  // it onto the socket (sendRaw returned false), so the row doesn't sit on
  // 'sending' forever with no error frame and no retry.
  const failOptimistic = useCallback((conversationId: string, clientMessageId: string) => {
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map((message) =>
        message.clientMessageId === clientMessageId
          ? { ...message, status: 'failed' as const }
          : message,
      ),
    }));
  }, []);

  return { messagesMap, appendOptimistic, failOptimistic };
}
