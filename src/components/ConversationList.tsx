import React, { useMemo, useState } from 'react';
import { Box, Button, Center, EmptyState, Input, InputGroup, Spinner, Stack } from '@chakra-ui/react';
import ConversationItem from './ConversationItem';
import { InboxArt, SearchArt, SearchIcon } from './icons';
import type { Conversation } from '../api/client';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conversation: Conversation) => void;
  loading: boolean;
  /** Last-message preview text per conversation id. */
  previews?: Record<string, string>;
  /** Unread-dot flag per conversation id. */
  unread?: Record<string, boolean>;
  /** Opens the "start a conversation" flow (wired to the direct-chat modal). */
  onStartChat?: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeId,
  onSelect,
  loading,
  previews,
  unread,
  onStartChat,
}) => {
  const [query, setQuery] = useState('');

  // Client-side filter over title + participant emails (no backend search).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (c.title || '').toLowerCase().includes(q) ||
        c.participants.some((p) => p.email.toLowerCase().includes(q)),
    );
  }, [conversations, query]);

  return (
    <Box display="flex" flexDir="column" flex="1" minH="0">
      <Box p={3} pb={2}>
        <InputGroup startElement={<SearchIcon color="text.muted" />}>
          <Input
            size="sm"
            colorPalette="brand"
            bg="bg.raised"
            borderColor={{ base: 'border.subtle', _dark: 'border.strong' }}
            _placeholder={{ color: 'text.muted' }}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </Box>

      <Box flex="1" overflowY="auto" px={2} pb={2}>
        {loading ? (
          <Center h="full">
            <Spinner color="brand.400" />
          </Center>
        ) : filtered.length === 0 ? (
          query.trim() ? (
            <EmptyState.Root>
              <EmptyState.Indicator>
                <SearchArt boxSize="88px" />
              </EmptyState.Indicator>
              <EmptyState.Title>No results</EmptyState.Title>
              <EmptyState.Description>Nothing matches “{query.trim()}”.</EmptyState.Description>
            </EmptyState.Root>
          ) : (
            <EmptyState.Root>
              <EmptyState.Indicator>
                <InboxArt boxSize="88px" />
              </EmptyState.Indicator>
              <EmptyState.Title>No conversations yet</EmptyState.Title>
              <EmptyState.Description>
                Search for someone by email to start a chat.
              </EmptyState.Description>
              {onStartChat && (
                <Button
                  size="sm"
                  bg="accent.solid"
                  color="text.inverse"
                  _hover={{ bg: 'accent.hover' }}
                  cartoon
                  mt={3}
                  onClick={onStartChat}
                >
                  Start a conversation
                </Button>
              )}
            </EmptyState.Root>
          )
        ) : (
          <Stack gap={0.5}>
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeId === conv.id}
                onClick={() => onSelect(conv)}
                preview={previews?.[conv.id] ?? null}
                unread={unread?.[conv.id]}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default ConversationList;
