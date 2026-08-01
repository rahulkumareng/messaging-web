import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import ConversationList from '../components/ConversationList';
import ChatView from '../components/ChatView';
import SidebarHeader from '../components/SidebarHeader';
import SidebarResizeHandle from '../components/SidebarResizeHandle';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupSettingsModal from '../components/GroupSettingsModal';
import NewDirectChatModal from '../components/NewDirectChatModal';
import { conversationsApi } from '../api/client';
import type { Conversation } from '../api/client';
import { useChatSocket } from '../hooks/useChatSocket';
import { useMessages } from '../hooks/useMessages';
import { usePreviewMap } from '../hooks/usePreviewMap';
import { useUnreadMap } from '../hooks/useUnreadMap';
import type { ChatMessageItem } from '../components/ChatView';
import { shortEmail } from '../utils/format';
import { uuidV1Timestamp } from '../utils/uuid';

/** Sidebar (conversation list) width bounds + default, for the drag resize. */
const SIDEBAR_DEFAULT = 380;
const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 560;

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email') || '';
  const currentUserId = localStorage.getItem('userId');

  // Mobile: sidebar and chat are separate screens; `mobileView` decides which
  // one is visible. Desktop (≥md) always shows both.
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Resizable conversation-list width (persisted; drag handle is desktop-only).
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = Number(localStorage.getItem('chat-sidebar-width'));
    return Number.isFinite(stored) && stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX
      ? stored
      : SIDEBAR_DEFAULT;
  });
  useEffect(() => {
    localStorage.setItem('chat-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  const { isConnected, incomingMessage, sendMessage, markAsRead, sendMessageDelivered } =
    useChatSocket(token);

  // ---- Domain state ----------------------------------------------------
  // Each hook owns one concern; ChatPage composes them. Keeping the chat
  // shell thin (state, layout, modal orchestration) is the whole point.

  // Stabilize the callbacks handed to useMessages so its frame-handling effect
  // doesn't re-fire every render. Both close only over stable setters, so empty
  // deps are correct. (An inline arrow here was the cause of the
  // "Maximum update depth" loop: incomingMessage stays non-null after a frame
  // arrives, so an unstable dep re-triggers the effect → setState → re-render.)
  const lookupParticipant = useCallback(
    (userId: string) =>
      conversations.flatMap((c) => c.participants).find((p) => p.userId === userId),
    [conversations],
  );
  const handleSocketError = useCallback((message: string) => {
    setSendError(message);
    window.setTimeout(() => setSendError(null), 6000);
  }, []);

  const { messagesMap, appendOptimistic } = useMessages(
    activeConversation,
    currentUserId,
    { incomingMessage, markAsRead, sendMessageDelivered },
    lookupParticipant,
    handleSocketError,
  );

  const previewMap = usePreviewMap(conversations, messagesMap);

  const { unreadMap, lastMessageMap, markWatermark } = useUnreadMap(
    conversations,
    currentUserId,
    messagesMap,
    previewMap,
  );

  // ---- Conversations --------------------------------------------------

  const fetchConversations = useCallback(async () => {
    try {
      const response = await conversationsApi.getAll();
      setConversations(response.data);

      setActiveConversation((prev) => {
        if (!prev) return null;
        const updated = response.data.find((c) => c.id === prev.id);
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

  // ---- Preview strings for the sidebar -------------------------------
  // In groups, prefix with the sender so you can tell who spoke; in direct
  // chats the identity is implied.
  const previewStrings = useMemo(() => {
    const result: Record<string, string> = {};
    for (const conv of conversations) {
      const last = lastMessageMap[conv.id];
      if (!last) continue;
      const prefix =
        conv.type === 'group' && last.senderId !== currentUserId && last.senderEmail
          ? `${shortEmail(last.senderEmail)}: `
          : '';
      result[conv.id] = `${prefix}${last.content}`;
    }
    return result;
  }, [conversations, lastMessageMap, currentUserId]);

  // ---- Handlers -------------------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    navigate('/login', { replace: true });
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setMobileView('chat');

    // Auto mark-read: advance my watermark to the newest incoming message
    // when switching to an already-loaded conversation. Newest is by timeuuid
    // timestamp, not array position (history order isn't guaranteed). The
    // history-load effect covers the first-open case where the map is empty.
    const msgs = messagesMap[conversation.id];
    if (msgs && msgs.length > 0) {
      const newestIncoming = msgs
        .filter((m) => m.senderId !== currentUserId)
        .reduce<ChatMessageItem | null>(
          (newest, m) =>
            !newest || uuidV1Timestamp(m.id) > uuidV1Timestamp(newest.id) ? m : newest,
          null,
        );
      if (newestIncoming) {
        markAsRead(conversation.id, newestIncoming.id);
        // Clear the unread dot immediately (functional update — the closure
        // above reads `messagesMap` from render scope).
        markWatermark(conversation.id, newestIncoming.id);
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

    const clientMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

    appendOptimistic(activeConversation.id, optimisticMsg);

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
    <Flex h="100dvh" overflow="hidden" bg="bg.canvas">
      {/* Sidebar */}
      <Box
        w={{ base: '100%', md: `${sidebarWidth}px` }}
        flexShrink="0"
        bg="bg.surface"
        borderRight="1px solid"
        borderColor="border.subtle"
        display={{ base: isMobile && mobileView === 'chat' ? 'none' : 'flex', md: 'flex' }}
        flexDirection="column"
        minH="0"
      >
        <SidebarHeader
          email={email}
          onOpenDirectChat={() => setIsDirectModalOpen(true)}
          onOpenNewGroup={() => setIsGroupModalOpen(true)}
          onLogout={handleLogout}
        />

        <ConversationList
          conversations={conversations}
          activeId={activeConversation?.id || null}
          onSelect={handleSelectConversation}
          loading={loading}
          previews={previewStrings}
          unread={unreadMap}
          onStartChat={() => setIsDirectModalOpen(true)}
        />
      </Box>

      {/* Resizable divider — desktop only (mobile sidebar is full-width). */}
      {!isMobile && (
        <SidebarResizeHandle
          width={sidebarWidth}
          min={SIDEBAR_MIN}
          max={SIDEBAR_MAX}
          onChange={setSidebarWidth}
        />
      )}

      {/* Chat Area */}
      <Box
        flex="1"
        minW="0"
        minH="0"
        display={{ base: isMobile && mobileView === 'list' ? 'none' : 'flex', md: 'flex' }}
        flexDirection="column"
      >
        <ChatView
          conversation={activeConversation}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          isConnected={isConnected}
          notice={sendError}
          onBack={() => setMobileView('list')}
        />
      </Box>

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
    </Flex>
  );
};

export default ChatPage;