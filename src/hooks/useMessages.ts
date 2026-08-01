import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessage, Conversation, ConversationParticipant } from '../api/client';
import { messagesApi } from '../api/client';
import type { WSMessageData } from './useChatSocket';
import type { ChatMessageItem } from '../components/ChatView';
import { uuidV1Timestamp } from '../utils/uuid';

/**
 * Owns the per-conversation message map for the chat shell.
 *
 * History is fetched on conversation switch (last 20 messages; the read
 * watermark is hydrated from each participant's `lastReadMessageId`). Live
 * frames from `useChatSocket` mutate the same map: `message_sent` advances
 * optimistic temps to 'sent', `message_delivered` upgrades to 'delivered',
 * `message_received` appends incoming messages, `message_read` paints blue
 * ticks, and server `error` events mark the matching optimistic row as
 * failed.
 *
 * The hook owns the map but the orchestrator owns how that map is consumed —
 * ChatPage pipes it into ChatView and into the unread/preview derivations.
 */
export function useMessages(
  activeConversation: Conversation | null,
  currentUserId: string | null,
  socket: {
    incomingMessage: { event: string; data: unknown } | null;
    markAsRead: (conversationId: string, messageId: string) => void;
    sendMessageDelivered: (conversationId: string, messageId: string) => void;
  },
  /** Fallback resolver for sender email when the active conversation is unknown. */
  participantsLookup?: (userId: string) => ConversationParticipant | undefined,
  /** Called when a server `error` frame carries a human-readable message. */
  onError?: (message: string) => void,
) {
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessageItem[]>>({});

  const { incomingMessage, markAsRead, sendMessageDelivered } = socket;

  // Latest-value refs so the effects below can fire on a narrow trigger
  // (conversation-id change / incoming frame) while still reading the
  // freshest participants — without re-firing on every refresh. This is the
  // "trigger on X, use latest Y" pattern (the useEvent use-case until that
  // hook lands).
  const activeConvRef = useRef(activeConversation);
  activeConvRef.current = activeConversation;
  const participantsLookupRef = useRef(participantsLookup);
  participantsLookupRef.current = participantsLookup;

  // History fetch on conversation switch — also advances my read watermark
  // once the history arrives, since select-handlers race the load.
  useEffect(() => {
    const conv = activeConvRef.current;
    if (!conv) return;

    const convId = conv.id;
    messagesApi
      .getMessages(convId, 20)
      .then((res) => {
        const fetchedMessages = res.data.messages || [];

        // Read cutoff: the furthest any OTHER participant has read. Used to
        // hydrate blue ticks for my outgoing messages that were read while I
        // was offline (or before this load). Live `message_read` events keep
        // this current afterward. Max watermark = "read by at least one",
        // matching the live single-reader fan-out behavior.
        const cutoffTs = conv.participants
          .filter((p) => p.userId !== currentUserId && p.lastReadMessageId)
          .reduce((max, p) => {
            const ts = uuidV1Timestamp(p.lastReadMessageId!);
            return ts > max ? ts : max;
          }, 0);

        const historyMsgs: ChatMessageItem[] = fetchedMessages.map((m) => {
          const participant = conv.participants.find((p) => p.userId === m.senderId);
          const isMine = m.senderId === currentUserId;
          return {
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            senderEmail: participant?.email,
            content: m.content,
            createdAt: m.createdAt,
            // My outgoing messages at or before the read cutoff are 'read'
            // (blue); everything else starts at 'delivered'. History only
            // contains persisted server messages, so all ids are timeuuids.
            status: isMine && uuidV1Timestamp(m.id) <= cutoffTs ? 'read' : 'delivered',
          };
        });

        setMessagesMap((prev) => {
          // Preserve messages already marked 'read' by live `message_read`
          // events so a re-fetch on switch-back — which hydrates from the
          // mount-time watermark (possibly stale) — never regresses a blue
          // tick back to gray. The live signal is the fresher source.
          const wasRead = new Set(
            (prev[convId] ?? []).filter((m) => m.status === 'read').map((m) => m.id),
          );
          const merged = historyMsgs.map((m) =>
            wasRead.has(m.id) ? { ...m, status: 'read' as const } : m,
          );
          return { ...prev, [convId]: merged };
        });

        // Opening a conversation means the reader has seen its messages, so
        // advance my read watermark to the newest incoming one and let the
        // gateway fan out blue ticks to the sender(s). This runs after the
        // fetch because handleSelectConversation races the history load (the
        // map is empty on first open). Re-marks are no-ops: the gateway's
        // monotonic guard suppresses stale receipts, so re-opening is cheap.
        const newestIncoming = fetchedMessages
          .filter((m) => m.senderId !== currentUserId)
          .reduce<ChatMessage | null>(
            (newest, m) =>
              !newest || uuidV1Timestamp(m.id) > uuidV1Timestamp(newest.id) ? m : newest,
            null,
          );
        if (newestIncoming) {
          markAsRead(convId, newestIncoming.id);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch message history:', err);
      });
  }, [activeConversation?.id, currentUserId, markAsRead]);

  // Live WS frame handling.
  useEffect(() => {
    if (!incomingMessage) return;

    const { event, data } = incomingMessage;

    if (event === 'message_sent') {
      // Sender ACK: Update status of local optimistic message from 'sending' -> 'sent'
      const msg = data as WSMessageData;
      setMessagesMap((prev) => {
        const convMessages = prev[msg.conversationId] || [];
        const updated = convMessages.map((m) => {
          if (m.clientMessageId === msg.clientMessageId) {
            return { ...m, id: msg.messageId || m.id, status: 'sent' as const };
          }
          return m;
        });
        return { ...prev, [msg.conversationId]: updated };
      });
    } else if (event === 'message_delivered') {
      // Delivery receipt from the gateway: upgrade MY outgoing message from
      // 'sending'/'sent' to 'delivered' (gray ✓✓). Match by messageId (Kafka
      // mode) OR clientMessageId (direct-fallback mode). Upgrade-only — a late
      // or reordered receipt must never downgrade an already-read (blue)
      // message back to gray.
      const msg = data as WSMessageData;
      setMessagesMap((prev) => {
        const convMessages = prev[msg.conversationId] || [];
        const updated = convMessages.map((m) => {
          if (m.senderId !== currentUserId) return m;
          const isTarget =
            (msg.messageId && m.id === msg.messageId) ||
            (msg.clientMessageId && m.clientMessageId === msg.clientMessageId);
          if (isTarget && (m.status === 'sending' || m.status === 'sent')) {
            return { ...m, status: 'delivered' as const };
          }
          return m;
        });
        return { ...prev, [msg.conversationId]: updated };
      });
    } else if (event === 'message_received') {
      // Incoming message from another user — append + acknowledge delivery.
      const msg = data as WSMessageData;
      // Look up sender email across all known participants. If the sender
      // isn't in any conversation we know about (rare — usually means we
      // joined the WS before /conversations resolved), the row simply omits
      // the email.
      const conv = activeConvRef.current;
      const lookup = participantsLookupRef.current;
      const senderParticipant: ConversationParticipant | undefined = msg.senderId
        ? conv?.participants.find((p) => p.userId === msg.senderId) ??
          lookup?.(msg.senderId)
        : undefined;
      setMessagesMap((prev) => {
        const convMessages = prev[msg.conversationId] || [];
        // Avoid duplicate rendering if the gateway resends.
        if (convMessages.some((m) => m.id === msg.messageId)) return prev;

        const newMsg: ChatMessageItem = {
          id: msg.messageId || `msg-${Date.now()}`,
          conversationId: msg.conversationId,
          senderId: msg.senderId || '',
          senderEmail: senderParticipant?.email,
          content: msg.content,
          createdAt: msg.createdAt || new Date().toISOString(),
          status: 'delivered',
        };

        return {
          ...prev,
          [msg.conversationId]: [...convMessages, newMsg],
        };
      });

      // Acknowledge delivery: this client has actually processed the frame, so
      // the sender's tick can upgrade to delivered. Runs even when the
      // conversation isn't open — delivery ≠ opened/read.
      if (msg.messageId) {
        sendMessageDelivered(msg.conversationId, msg.messageId);
      }

      // If this conversation is currently open, auto mark as read.
      if (conv?.id === msg.conversationId && msg.messageId) {
        markAsRead(msg.conversationId, msg.messageId);
      }
    } else if (event === 'message_read') {
      // Blue tick: the reader read up to lastReadMessageId. Mark only MY
      // outgoing messages at or before that watermark as 'read' — not the
      // whole conversation. Compare by v1 timeuuid timestamp so "at or
      // before" is chronological, not canonical-string (byte) order.
      const msg = data as WSMessageData;
      if (!msg.lastReadMessageId) return;
      const watermarkTs = uuidV1Timestamp(msg.lastReadMessageId);
      setMessagesMap((prev) => {
        const convMessages = prev[msg.conversationId] || [];
        const updated = convMessages.map((m) => {
          if (m.senderId !== currentUserId) return m;
          // Skip messages that were never delivered: their ids are local temp-
          // ids (NaN timestamp), so they can't have been read by anyone.
          if (m.status === 'sending' || m.status === 'failed') return m;
          // Only mark up to and including the watermark (chronological order).
          if (uuidV1Timestamp(m.id) > watermarkTs) return m;
          return { ...m, status: 'read' as const };
        });
        return { ...prev, [msg.conversationId]: updated };
      });
    } else if (event === 'error') {
      // Server rejection: FORBIDDEN (not a member) or PERSIST_FAILED. The
      // server echoes clientMessageId + conversationId so we can fail exactly
      // the optimistic message it refers to.
      const errData = data as {
        code?: string;
        message?: string;
        clientMessageId?: string;
        conversationId?: string;
      };
      setMessagesMap((prev) => {
        if (!errData.conversationId || !prev[errData.conversationId]) return prev;
        return {
          ...prev,
          [errData.conversationId]: prev[errData.conversationId].map((m) =>
            m.clientMessageId === errData.clientMessageId
              ? { ...m, status: 'failed' as const }
              : m,
          ),
        };
      });

      if (errData.message && onError) {
        onError(errData.message);
      }
    }
  }, [incomingMessage, currentUserId, markAsRead, sendMessageDelivered, onError]);

  // Optimistic send — called by ChatPage when ChatView emits. The WS gateway
  // will fan out the matching `message_sent` frame to land this row at 'sent'.
  const appendOptimistic = useCallback(
    (conversationId: string, item: ChatMessageItem) => {
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), item],
      }));
    },
    [],
  );

  return { messagesMap, appendOptimistic };
}
