import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Flex, Text, useBreakpointValue } from '@chakra-ui/react';
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
import { MAX_MESSAGE_LENGTH } from '../constants';
import type { ChatMessageItem } from '../types/messages';
import { shortEmail } from '../utils/format';
import { uuidV1Timestamp } from '../utils/uuid';
import { createOptimisticMessage, newClientMessageId } from '../utils/ws';

/** Sidebar (conversation list) width bounds + default, for the drag resize. */
const SIDEBAR_DEFAULT = 380;
const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 560;

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [conversationsError, setConversationsError] = useState(false);
  // Tracks the 6s auto-clear for sendError so a newer error supersedes the
  // pending timer and logout never lets it fire on an unmounted page.
  const sendErrorTimerRef = useRef<number | null>(null);

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
      conversations.flatMap((conversation) => conversation.participants).find((participant) => participant.userId === userId),
    [conversations],
  );
  const handleSocketError = useCallback((message: string) => {
    setSendError(message);
    // Supersede any pending auto-clear (a newer error owns the next 6s).
    if (sendErrorTimerRef.current !== null) {
      window.clearTimeout(sendErrorTimerRef.current);
    }
    sendErrorTimerRef.current = window.setTimeout(() => setSendError(null), 6000);
  }, []);

  // Never let the auto-clear timer fire after logout/unmount.
  useEffect(
    () => () => {
      if (sendErrorTimerRef.current !== null) {
        window.clearTimeout(sendErrorTimerRef.current);
      }
    },
    [],
  );

  // useMessages needs a STABLE onMarkRead callback (it's in the frame effect's
  // deps — an inline arrow would re-fire it every render), but markWatermark
  // only exists after useUnreadMap runs, and useUnreadMap needs messagesMap
  // from useMessages — a genuine render-order cycle. Break it with a ref that
  // useUnreadMap fills in (same latest-value pattern as the hook internals).
  const markWatermarkRef = useRef<(conversationId: string, messageId: string) => void>(() => {});
  const handleMarkRead = useCallback((conversationId: string, messageId: string) => {
    markWatermarkRef.current(conversationId, messageId);
  }, []);

  const { messagesMap, appendOptimistic, failOptimistic } = useMessages(
    activeConversation,
    currentUserId,
    { incomingMessage, markAsRead, sendMessageDelivered, isConnected },
    lookupParticipant,
    handleSocketError,
    handleMarkRead,
  );

  const previewMap = usePreviewMap(conversations, messagesMap);

  const { unreadMap, lastMessageMap, markWatermark } = useUnreadMap(
    conversations,
    currentUserId,
    messagesMap,
    previewMap,
  );
  markWatermarkRef.current = markWatermark;

  // ---- Conversations --------------------------------------------------

  const handleFetchConversations = useCallback(async () => {
    setConversationsError(false);
    try {
      const response = await conversationsApi.getAll();
      setConversations(response.data);

      setActiveConversation((prev) => {
        if (!prev) return null;
        const updated = response.data.find((conversation) => conversation.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      // Without this the sidebar shows "No conversations yet" and lies —
      // a failed load is indistinguishable from genuinely having none.
      setConversationsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleFetchConversations();
  }, [handleFetchConversations]);

  // ---- Preview strings for the sidebar -------------------------------
  // In groups, prefix with the sender so you can tell who spoke; in direct
  // chats the identity is implied.
  const previewStrings = useMemo(() => {
    const previews: Record<string, string> = {};
    for (const conversation of conversations) {
      const last = lastMessageMap[conversation.id];
      if (!last) continue;
      const prefix =
        conversation.type === 'group' && last.senderId !== currentUserId && last.senderEmail
          ? `${shortEmail(last.senderEmail)}: `
          : '';
      previews[conversation.id] = `${prefix}${last.content}`;
    }
    return previews;
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
    const messages = messagesMap[conversation.id];
    if (messages && messages.length > 0) {
      const newestIncoming = messages
        .filter((message) => message.senderId !== currentUserId)
        .reduce<ChatMessageItem | null>(
          (newest, message) =>
            !newest || uuidV1Timestamp(message.id) > uuidV1Timestamp(newest.id) ? message : newest,
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

    // Client-side cap so we never hit the server's MaxLength — the gateway
    // silently drops oversized frames (no error frame comes back).
    if (content.length > MAX_MESSAGE_LENGTH) {
      setSendError(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
      return;
    }
    setSendError(null);

    const clientMessageId = newClientMessageId();

    // 1. Optimistically append message locally
    const optimisticMessage = createOptimisticMessage({
      conversationId: activeConversation.id,
      content,
      clientMessageId,
      senderId: currentUserId || '',
      senderEmail: email,
    });

    appendOptimistic(activeConversation.id, optimisticMessage);

    // 2. Dispatch to WebSocket. If the frame never made it onto the socket
    // (dropped between render and send), fail the row immediately — otherwise
    // it would sit on 'sending' forever with no error frame and no retry.
    const sent = sendMessage(activeConversation.id, content, clientMessageId);
    if (!sent) {
      failOptimistic(activeConversation.id, clientMessageId);
    }
  };

  const handleGroupCreated = () => {
    setIsGroupModalOpen(false);
    handleFetchConversations();
  };

  const handleDirectCreated = (conversation: Conversation) => {
    setIsDirectModalOpen(false);
    setActiveConversation(conversation);
    handleFetchConversations();
  };

  const handleSettingsUpdated = () => {
    setIsSettingsModalOpen(false);
    handleFetchConversations();
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

        {conversationsError && (
          <Flex
            role="alert"
            align="center"
            justify="space-between"
            gap={2}
            px={5}
            py={2.5}
            fontSize="sm"
            color="danger.solid"
            bg="danger.muted"
            borderBottom="1px solid"
            borderColor="danger.border"
          >
            <Text>Could not load conversations.</Text>
            <Button size="xs" variant="ghost" color="danger.solid" onClick={handleFetchConversations}>
              Retry
            </Button>
          </Flex>
        )}

        <ConversationList
          conversations={conversations}
          activeId={activeConversation?.id || null}
          onSelect={handleSelectConversation}
          isLoading={isLoading}
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