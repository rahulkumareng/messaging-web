import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ConversationList from '../components/ConversationList';
import ChatView from '../components/ChatView';
import AvatarInitials from '../components/AvatarInitials';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupSettingsModal from '../components/GroupSettingsModal';
import NewDirectChatModal from '../components/NewDirectChatModal';
import { conversationsApi, messagesApi } from '../api/client';
import type { ChatMessage, Conversation } from '../api/client';
import { useChatSocket } from '../hooks/useChatSocket';
import type { WSMessageData } from '../hooks/useChatSocket';
import type { ChatMessageItem } from '../components/ChatView';
import { uuidV1Timestamp } from '../utils/uuid';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessageItem[]>>({});
  const [sendError, setSendError] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email') || '';
  const currentUserId = localStorage.getItem('userId');

  const { isConnected, incomingMessage, sendMessage, markAsRead, ackDelivered } = useChatSocket(token);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await conversationsApi.getAll();
      setConversations(response.data);
      
      setActiveConversation(prev => {
        if (!prev) return null;
        const updated = response.data.find(c => c.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch message history whenever active conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const convId = activeConversation.id;
    messagesApi.getMessages(convId, 20)
      .then(res => {
        const fetchedMessages = res.data.messages || [];

        // Read cutoff: the furthest any OTHER participant has read. Used to
        // hydrate blue ticks for my outgoing messages that were read while I
        // was offline (or before this load). Live `message_read` events keep
        // this current afterward. Max watermark = "read by at least one",
        // matching the live single-reader fan-out behavior.
        const cutoffTs = activeConversation.participants
          .filter(p => p.userId !== currentUserId && p.lastReadMessageId)
          .reduce((max, p) => {
            const ts = uuidV1Timestamp(p.lastReadMessageId!);
            return ts > max ? ts : max;
          }, 0);

        const historyMsgs: ChatMessageItem[] = fetchedMessages.map(m => {
          const participant = activeConversation.participants.find(p => p.userId === m.senderId);
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

        setMessagesMap(prev => {
          // Preserve messages already marked 'read' by live `message_read`
          // events so a re-fetch on switch-back — which hydrates from the
          // mount-time watermark (possibly stale) — never regresses a blue
          // tick back to gray. The live signal is the fresher source.
          const wasRead = new Set(
            (prev[convId] ?? []).filter(m => m.status === 'read').map(m => m.id),
          );
          const merged = historyMsgs.map(m =>
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
          .filter(m => m.senderId !== currentUserId)
          .reduce<ChatMessage | null>(
            (newest, m) =>
              !newest || uuidV1Timestamp(m.id) > uuidV1Timestamp(newest.id) ? m : newest,
            null,
          );
        if (newestIncoming) {
          markAsRead(convId, newestIncoming.id);
        }
      })
      .catch(err => {
        console.error('Failed to fetch message history:', err);
      });
  }, [activeConversation?.id]);

  // Handle incoming WS frames
  useEffect(() => {
    if (!incomingMessage) return;

    const { event, data } = incomingMessage;

    if (event === 'message_sent') {
      // Sender ACK: Update status of local optimistic message from 'sending' -> 'sent'
      const msg = data as WSMessageData;
      setMessagesMap(prev => {
        const convMessages = prev[msg.conversationId] || [];
        const updated = convMessages.map(m => {
          if (m.clientMessageId === msg.clientMessageId) {
            return { ...m, id: msg.messageId || m.id, status: 'sent' as const };
          }
          return m;
        });
        return { ...prev, [msg.conversationId]: updated };
      });
    } else if (event === 'message_delivered') {
      // Delivery receipt from the gateway: upgrade my outgoing message from
      // 'sent' to 'delivered' (gray ✓✓). Upgrade-only — a late or reordered
      // receipt must never downgrade an already-read (blue) message back to gray.
      const msg = data as WSMessageData;
      setMessagesMap(prev => {
        const convMessages = prev[msg.conversationId] || [];
        const updated = convMessages.map(m => {
          if (m.clientMessageId === msg.clientMessageId && (m.status === 'sending' || m.status === 'sent')) {
            return { ...m, status: 'delivered' as const };
          }
          return m;
        });
        return { ...prev, [msg.conversationId]: updated };
      });
    } else if (event === 'message_received') {
      // Incoming message from another user — append, and mark read if open
      const msg = data as WSMessageData;
      setMessagesMap(prev => {
        const convMessages = prev[msg.conversationId] || [];
        // Avoid duplicate rendering
        if (convMessages.some(m => m.id === msg.messageId)) return prev;

        const senderParticipant = conversations
          .flatMap(c => c.participants)
          .find(p => p.userId === msg.senderId);

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
        ackDelivered(msg.conversationId, msg.messageId);
      }

      // If this conversation is currently open, auto mark as read
      if (activeConversation?.id === msg.conversationId && msg.messageId) {
        markAsRead(msg.conversationId, msg.messageId);
      }
    } else if (event === 'message_read') {
      // Blue tick: the reader read up to lastReadMessageId. Mark only MY
      // outgoing messages at or before that watermark as 'read' — not the whole
      // conversation (the watermark may be an older message), and never
      // incoming or others' messages. Compare by the v1 timeuuid timestamp so
      // "at or before" is chronological, not canonical-string (byte) order.
      const msg = data as WSMessageData;
      if (!msg.lastReadMessageId) return;
      const watermarkTs = uuidV1Timestamp(msg.lastReadMessageId);
      setMessagesMap(prev => {
        const convMessages = prev[msg.conversationId] || [];
        const updated = convMessages.map(m => {
          // Only my outgoing messages can be marked read by someone else.
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
      // Server rejection: FORBIDDEN (not a member) or PERSIST_FAILED.
      // The server echoes clientMessageId + conversationId so we can fail
      // exactly the optimistic message it refers to.
      const errData = data as {
        code?: string;
        message?: string;
        clientMessageId?: string;
        conversationId?: string;
      };

      setMessagesMap(prev => {
        if (!errData.conversationId || !prev[errData.conversationId]) return prev;
        return {
          ...prev,
          [errData.conversationId]: prev[errData.conversationId].map(m =>
            m.clientMessageId === errData.clientMessageId
              ? { ...m, status: 'failed' as const }
              : m
          ),
        };
      });

      if (errData.message) {
        setSendError(errData.message);
        window.setTimeout(() => setSendError(null), 6000);
      }
    }
  }, [incomingMessage, conversations, activeConversation, markAsRead, ackDelivered]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    navigate('/login', { replace: true });
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);

    // Auto mark-read: advance my watermark to the newest incoming message
    // when switching to an already-loaded conversation. Newest is by timeuuid
    // timestamp, not array position (history order isn't guaranteed). The
    // history-load effect covers the first-open case where the map is empty.
    const msgs = messagesMap[conversation.id];
    if (msgs && msgs.length > 0) {
      const newestIncoming = msgs
        .filter(m => m.senderId !== currentUserId)
        .reduce<ChatMessageItem | null>(
          (newest, m) =>
            !newest || uuidV1Timestamp(m.id) > uuidV1Timestamp(newest.id) ? m : newest,
          null,
        );
      if (newestIncoming) {
        markAsRead(conversation.id, newestIncoming.id);
      }
    }
  };

  const handleSendMessage = (content: string) => {
    if (!activeConversation) return;

    // Client-side cap so we never hit the server's MaxLength(4000) — the
    // gateway silently drops oversized frames (no error frame comes back).
    if (content.length > 4000) {
      setSendError('Message is too long (max 4000 characters).');
      return;
    }
    setSendError(null);

    const clientMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // 1. Optimistically append message locally
    const optimisticMsg: ChatMessageItem = {
      id: clientMessageId,
      clientMessageId,
      conversationId: activeConversation.id,
      senderId: currentUserId || '',
      senderEmail: email,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessagesMap(prev => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), optimisticMsg],
    }));

    // 2. Dispatch to WebSocket
    sendMessage(activeConversation.id, content, clientMessageId);
  };

  const handleGroupCreated = () => {
    setIsGroupModalOpen(false);
    fetchConversations();
  };

  const handleDirectCreated = (conversation: Conversation) => {
    setIsDirectModalOpen(false);
    setActiveConversation(conversation);
    fetchConversations();
  };

  const handleSettingsUpdated = () => {
    setIsSettingsModalOpen(false);
    fetchConversations();
  };

  const activeMessages = activeConversation ? (messagesMap[activeConversation.id] || []) : [];

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Messenger</h2>
          <div className="sidebar-user-info">
            <AvatarInitials name={email} size="small" />
            
            <button className="btn-icon" onClick={() => setIsDirectModalOpen(true)} title="New Direct Chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>

            <button className="btn-icon" onClick={() => setIsGroupModalOpen(true)} title="New Group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>

            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeConversation?.id || null}
          onSelect={handleSelectConversation}
          loading={loading}
        />
      </div>

      {/* Chat Area */}
      <ChatView
        conversation={activeConversation}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        messages={activeMessages}
        onSendMessage={handleSendMessage}
        isConnected={isConnected}
        notice={sendError}
      />

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSuccess={handleGroupCreated}
      />

      <NewDirectChatModal
        isOpen={isDirectModalOpen}
        onClose={() => setIsDirectModalOpen(false)}
        onSuccess={handleDirectCreated}
      />

      {activeConversation && activeConversation.type === 'group' && (
        <GroupSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onSuccess={handleSettingsUpdated}
          conversation={activeConversation}
        />
      )}
    </div>
  );
};

export default ChatPage;
