import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  EmptyState,
  Flex,
  Heading,
  IconButton,
  Text,
  Textarea,
  useMediaQuery,
  useSafeLayoutEffect,
} from '@chakra-ui/react';
import AvatarInitials from './AvatarInitials';
import { ChatArt, ChevronLeftIcon, GearIcon, MessageStatusIcon, SendIcon } from './icons';
import { formatDayLabel, formatTimeOfDay } from '../utils/format';
import { buildMessageRows, type MessageRow } from '../lib/messages';
import type { Conversation } from '../api/client';
import type { WSMessageData } from '../hooks/useChatSocket';

export interface ChatMessageItem extends WSMessageData {
  id: string;
  senderEmail?: string;
}

interface ChatViewProps {
  conversation: Conversation | null;
  onOpenSettings?: () => void;
  messages: ChatMessageItem[];
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  /** Transient notice to show above the input bar (e.g. message failed to send). */
  notice?: string | null;
  /** Mobile: return to the conversation list. */
  onBack?: () => void;
}

const MAX_INPUT_HEIGHT = 160;

const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onOpenSettings,
  messages,
  onSendMessage,
  isConnected,
  notice,
  onBack,
}) => {
  const [text, setText] = useState('');
  // Ref on the messages scroll container (not a trailing sentinel): we drive
  // the scroll ourselves via scrollTop so only THIS box scrolls —
  // scrollIntoView would yank every scrollable ancestor (the header, the
  // page) and "the whole container moves" on send.
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const currentUserId = localStorage.getItem('userId');
  const currentUserEmail = localStorage.getItem('email');
  const [reducedMotion] = useMediaQuery(['(prefers-reduced-motion: reduce)']);

  // Auto-grow the textarea up to MAX_INPUT_HEIGHT. Hand-rolled: Chakra v3 has
  // no built-in auto-resize textarea.
  useSafeLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [text]);

  // Scroll to bottom only when a genuinely new message arrives — receipt
  // ticks (sending→sent→delivered→read) mutate the array but must not yank
  // the scroll position mid-conversation.
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [reducedMotion]);

  useEffect(() => {
    const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;
    if (lastId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastId;
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Rows: day separators + same-sender clusters (60s window). A day change
  // always breaks a cluster; a sender change always starts a new one.
  const rows = useMemo<MessageRow<ChatMessageItem>[]>(
    () =>
      buildMessageRows(messages, {
        formatDayLabel: (date) => formatDayLabel(date),
      }),
    [messages],
  );

  if (!conversation) {
    return (
      <Flex flex="1" direction="column" align="center" justify="center" bg="bg.canvas">
        <EmptyState.Root>
          <EmptyState.Indicator>
            <ChatArt boxSize="88px" />
          </EmptyState.Indicator>
          <EmptyState.Title>Welcome to Messenger</EmptyState.Title>
          <EmptyState.Description>
            Pick a conversation from the sidebar to start chatting
          </EmptyState.Description>
        </EmptyState.Root>
      </Flex>
    );
  }

  const participantEmails = conversation.participants
    .map((p) => p.email)
    .join(', ');

  // Direct chats: label with the other participant, not all emails joined
  // (same self-label pitfall as the sidebar list).
  const otherParticipant = conversation.participants.find(
    (p) => p.email !== currentUserEmail,
  );
  const displayName =
    conversation.title ||
    (conversation.type === 'direct' && otherParticipant?.email) ||
    participantEmails;
  const isAdmin =
    conversation.type === 'group' &&
    conversation.participants.find((p) => p.email === currentUserEmail)?.role === 'admin';
  const participantCountLabel = `${conversation.participants.length} participant${
    conversation.participants.length !== 1 ? 's' : ''
  }`;

  const submit = () => {
    if (!text.trim() || !isConnected) return;
    onSendMessage(text.trim());
    setText('');
  };

  // The send control is the app's energy moment: idle it stays graphite; the
  // moment you type it warms to amber — a live "ready to send" affordance.
  const canSend = Boolean(text.trim()) && isConnected;

  return (
    <Flex flex="1" direction="column" minW="0" minH="0" bg="bg.canvas">
      {/* Header */}
      <Flex
        align="center"
        gap={3.5}
        px={{ base: 4, md: 7 }}
        py={4}
        bg="bg.surface"
        borderBottom="1px solid"
        borderColor="border.subtle"
        flexShrink="0"
      >
        <IconButton
          aria-label="Back to conversations"
          variant="ghost"
          size="sm"
          display={{ base: 'inline-flex', md: 'none' }}
          _hover={{ color: 'warm.text', bg: 'warm.muted' }}
          onClick={onBack}
        >
          <ChevronLeftIcon />
        </IconButton>

        <AvatarInitials name={displayName} size="large" />

        <Box flex="1" minW="0">
          <Flex align="center" gap={1.5}>
            <Heading as="h3" size="sm" fontWeight="semibold" truncate>
              {displayName}
            </Heading>
            {isAdmin && (
              <IconButton
                aria-label="Group settings"
                variant="ghost"
                size="xs"
                flexShrink="0"
                _hover={{ color: 'warm.text' }}
                onClick={onOpenSettings}
              >
                <GearIcon />
              </IconButton>
            )}
          </Flex>
          <Text fontSize="xs" color="text.secondary" truncate>
            {conversation.type === 'group' ? participantCountLabel : 'Direct Message'}
            {' · '}
            {participantEmails}
          </Text>
        </Box>

        {/* Connection state — honest and always visible */}
        <Flex
          role="status"
          aria-live="polite"
          align="center"
          gap={1.5}
          fontSize="xs"
          fontWeight="medium"
          flexShrink="0"
          color={isConnected ? 'success.solid' : 'danger.solid'}
        >
          <Box
            boxSize="6px"
            borderRadius="full"
            bg={isConnected ? 'success.solid' : 'danger.solid'}
            animation={isConnected ? 'pulse 2.4s ease-in-out infinite' : undefined}
          />
          {isConnected ? 'Connected' : 'Connecting...'}
        </Flex>
      </Flex>

      {/* Messages Area — the independent scroll container. minH="0" is
       * load-bearing: in a flex column, a `flex:1` child defaults to
       * min-height:auto, so its content would grow the box past its basis and
       * push the 100dvh parent (the whole page would scroll instead of this
       * box). minH={0} lets the box shrink and scroll internally. */}
      <Box
        ref={scrollRef}
        flex="1"
        minH="0"
        overflowY="auto"
        px={{ base: 4, md: 6 }}
        py={5}
        display="flex"
        flexDirection="column"
        gap={2.5}
      >
        {rows.length === 0 ? (
          <Flex flex="1" align="center" justify="center">
            <EmptyState.Root>
              <EmptyState.Indicator>
                <ChatArt boxSize="88px" />
              </EmptyState.Indicator>
              <EmptyState.Title>No messages yet</EmptyState.Title>
              <EmptyState.Description>
                Send the first message below to start chatting.
              </EmptyState.Description>
            </EmptyState.Root>
          </Flex>
        ) : (
          rows.map((row) => {
            if (row.kind === 'separator') {
              return (
                <Text
                  key={row.key}
                  alignSelf="center"
                  position="sticky"
                  top="0"
                  zIndex={1}
                  fontSize="xs"
                  fontWeight="medium"
                  color="text.muted"
                  bg="bg.raised"
                  border="1px solid"
                  borderColor={{ base: 'border.strong', _dark: 'border.ink-light' }}
                  borderRadius="full"
                  px={3}
                  py={1}
                >
                  {row.label}
                </Text>
              );
            }

            const cluster = row.msgs;
            const first = cluster[0];
            const last = cluster[cluster.length - 1];
            const isMe = first.senderId === currentUserId;
            const showSender = !isMe && conversation.type === 'group' && first.senderEmail;

            return (
              <Flex
                key={row.key}
                direction="column"
                maxW={{ base: '85%', md: '70%' }}
                alignSelf={isMe ? 'flex-end' : 'flex-start'}
                alignItems={isMe ? 'flex-end' : 'flex-start'}
              >
                {showSender && (
                  <Text fontSize="xs" color="text.secondary" mb={1} ml={1} truncate>
                    {first.senderEmail}
                  </Text>
                )}
                {cluster.map((msg, i) => (
                  <Flex
                    key={msg.id}
                    direction="column"
                    alignItems={isMe ? 'flex-end' : 'flex-start'}
                    mt={i > 0 ? 0.5 : 0}
                    animation="spring-in 180ms ease-out"
                  >
                    <Box
                      p={2.5}
                      fontSize="md"
                      lineHeight="1.5"
                      wordBreak="break-word"
                      whiteSpace="pre-wrap"
                      bg={isMe ? 'accent.solid' : 'bg.raised'}
                      color={isMe ? 'text.inverse' : 'text.primary'}
                      border="2px solid"
                      // Outline follows fill luminance: my graphite bubbles get
                      // a light outline (canvas in light, ink-light in dark);
                      // theirs stay dark-ink in light, ink-light in dark.
                      borderColor={
                        isMe
                          ? { base: 'bg.canvas', _dark: 'border.ink-light' }
                          : { base: 'border.ink', _dark: 'border.ink-light' }
                      }
                      borderRadius="xl"
                    >
                      {msg.content}
                    </Box>
                    {isMe && msg.status && (
                      <Flex mt={0.5} pr={1}>
                        <MessageStatusIcon status={msg.status} />
                      </Flex>
                    )}
                  </Flex>
                ))}
                {last.createdAt && (
                  <Text fontSize="xs" color="text.muted" mt={1} px={1}>
                    {formatTimeOfDay(new Date(last.createdAt))}
                  </Text>
                )}
              </Flex>
            );
          })
        )}
      </Box>

      {/* Input Bar */}
      <Box as="form" flexShrink="0" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {notice && (
          <Box
            role="alert"
            px={{ base: 4, md: 6 }}
            py={2}
            fontSize="sm"
            color="danger.solid"
            bg="danger.muted"
            borderTop="1px solid"
            borderColor="danger.border"
          >
            {notice}
          </Box>
        )}

        <Flex
          align="flex-end"
          gap={2.5}
          px={{ base: 3, md: 6 }}
          py={3.5}
          bg="bg.surface"
          borderTop="1px solid"
          borderColor="border.subtle"
        >
          <Textarea
            ref={textareaRef}
            aria-label="Message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={isConnected ? 'Type a message...' : 'Connecting to chat server...'}
            disabled={!isConnected}
            maxLength={4000}
            rows={1}
            resize="none"
            minH="44px"
            maxH={`${MAX_INPUT_HEIGHT}px`}
            flex="1"
            bg="bg.raised"
            borderColor={{ base: 'border.strong', _dark: 'border.ink-light' }}
            colorPalette="brand"
            _focus={{ borderColor: 'border.accent', boxShadow: 'none' }}
            _placeholder={{ color: 'text.muted' }}
          />
          <IconButton
            type="submit"
            aria-label="Send message"
            h="44px"
            w="44px"
            borderRadius="lg"
            flexShrink="0"
            bg={canSend ? 'warm.solid' : 'accent.solid'}
            color={canSend ? 'brand.700' : 'text.inverse'}
            borderColor="border.ink"
            cartoon
            _hover={{ bg: canSend ? 'warm.hover' : 'accent.hover' }}
            _active={{ bg: canSend ? 'warm.hover' : 'accent.solid' }}
            disabled={!canSend}
          >
            <SendIcon />
          </IconButton>
        </Flex>

        {text.length > 3500 && (
          <Text
            textAlign="right"
            fontSize="xs"
            color="text.muted"
            px={{ base: 3, md: 6 }}
            pb={2}
          >
            {text.length}/4000
          </Text>
        )}
      </Box>
    </Flex>
  );
};

export default ChatView;
