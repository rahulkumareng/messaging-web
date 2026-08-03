import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { Box, Flex, Text, useMediaQuery, useSafeLayoutEffect } from '@chakra-ui/react';
import ChatEmptyState from './ChatEmptyState';
import MessageCluster from './MessageCluster';
import { buildMessageRows, type MessageRow } from '../utils/thread';
import { formatDayLabel } from '../utils/format';
import type { ChatMessageItem } from '../types/messages';

interface ChatMessageThreadProps {
  conversationId: string;
  messages: ChatMessageItem[];
  currentUserId: string | null;
  /** Group chats render a sender label above each cluster. */
  isGroup: boolean;
}

/** Within this many px of the bottom counts as "at the bottom" — incoming
 * messages only auto-follow when the reader is here (never yank a scroller). */
const NEAR_BOTTOM_PX = 120;

/**
 * The message thread: the independent scroll container + the day separators
 * and same-sender clusters inside it. Owns ALL scroll behavior — only THIS
 * box scrolls, never its ancestors:
 * - opening a conversation positions the view instantly (no fly-through):
 *   restore that conversation's saved scroll position, or land at the bottom
 *   on first open,
 * - new messages smooth-follow only when the reader is already at the bottom
 *   (my own sends always follow), so reading history is never yanked.
 *
 * minH="0" is load-bearing: in a flex column, a `flex:1` child defaults to
 * min-height:auto, so its content would grow the box past its basis and push
 * the 100dvh parent (the whole page would scroll instead of this box).
 * minH={0} lets the box shrink and scroll internally.
 */
const ChatMessageThread: React.FC<ChatMessageThreadProps> = ({
  conversationId,
  messages,
  currentUserId,
  isGroup,
}) => {
  // Ref on the scroll container (not a trailing sentinel): we drive the
  // scroll ourselves via scrollTop so only THIS box scrolls — scrollIntoView
  // would yank every scrollable ancestor (the header, the page) and "the
  // whole container moves" on send.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reducedMotion] = useMediaQuery(['(prefers-reduced-motion: reduce)']);

  // Scroll-position memory per conversation: where the reader left each one
  // (saved on scroll). A conversation with no entry has never been read up →
  // first open lands at the bottom.
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const lastConversationIdRef = useRef<string | null>(null);
  // Set while the opened conversation's content is still loading; cleared once
  // the view has been positioned (instant, never animated).
  const awaitingPositionRef = useRef(false);
  // Follow-baseline: the last message id the follow effect consumed.
  const lastFollowedConvRef = useRef<string | null>(null);
  const lastFollowedIdRef = useRef<string | null>(null);

  // Smooth-follow to the bottom on a new message.
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [reducedMotion]);

  // Position the view when a conversation opens: restore its saved scroll
  // position, or jump to the bottom on first open — always instantly. Runs as
  // a layout effect so the reader never sees the intermediate state; history
  // loads async, so this re-checks on every messages change until content is
  // present, then clears the flag (receipt ticks must not re-position).
  useSafeLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (lastConversationIdRef.current !== conversationId) {
      lastConversationIdRef.current = conversationId;
      awaitingPositionRef.current = true;
    }
    if (!awaitingPositionRef.current) return;
    if (messages.length === 0) return; // history still loading

    const saved = scrollPositionsRef.current[conversationId];
    el.scrollTop = saved !== undefined ? saved : el.scrollHeight;
    awaitingPositionRef.current = false;
  }, [conversationId, messages]);

  // Follow NEW messages only. The layout effect above owns the open-position
  // (restore/bottom); this effect seeds its baseline on conversation switch
  // and only follows what arrives after — and even then, an incoming message
  // follows only when the reader is already near the bottom.
  useEffect(() => {
    if (lastFollowedConvRef.current !== conversationId) {
      lastFollowedConvRef.current = conversationId;
      lastFollowedIdRef.current = messages.length > 0 ? messages[messages.length - 1].id : null;
      return;
    }
    const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;
    if (lastId === lastFollowedIdRef.current) return;
    lastFollowedIdRef.current = lastId;

    const el = scrollRef.current;
    if (!el || !lastId) return;
    const last = messages[messages.length - 1];
    // My own sends always follow (the sender wants to see their message);
    // incoming messages follow only when the reader is already at the bottom.
    if (last.senderId !== currentUserId) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom > NEAR_BOTTOM_PX) return;
    }
    scrollToBottom();
  }, [messages, conversationId, currentUserId, scrollToBottom]);

  // Rows: day separators + same-sender clusters (60s window). A day change
  // always breaks a cluster; a sender change always starts a new one.
  const rows = useMemo<MessageRow<ChatMessageItem>[]>(
    () =>
      buildMessageRows(messages, {
        formatDayLabel: (date) => formatDayLabel(date),
      }),
    [messages],
  );

  return (
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
      onScroll={(e) => {
        scrollPositionsRef.current[conversationId] = e.currentTarget.scrollTop;
      }}
    >
      {rows.length === 0 ? (
        <Flex flex="1" align="center" justify="center">
          <ChatEmptyState
            title="No messages yet"
            description="Send the first message below to start chatting."
          />
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

          const cluster = row.messages;
          const isMe = cluster[0].senderId === currentUserId;
          const showSender = Boolean(!isMe && isGroup && cluster[0].senderEmail);

          return (
            <MessageCluster key={row.key} messages={cluster} isMe={isMe} showSender={showSender} />
          );
        })
      )}
    </Box>
  );
};

export default ChatMessageThread;
