import React from 'react';
import { Box, Flex, Heading, IconButton, Text } from '@chakra-ui/react';
import AvatarInitials from './AvatarInitials';
import { ChevronLeftIcon, GearIcon } from './icons';
import type { Conversation } from '../api/client';

interface ChatHeaderProps {
  conversation: Conversation;
  currentUserEmail: string;
  isConnected: boolean;
  /** Mobile: return to the conversation list. */
  onBack?: () => void;
  onOpenSettings?: () => void;
}

/**
 * The chat column's top bar: back button (mobile), avatar, conversation
 * identity (direct → the other participant, group → title + admin gear),
 * participant line, and the honest always-visible connection state.
 */
const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  currentUserEmail,
  isConnected,
  onBack,
  onOpenSettings,
}) => {
  const participantEmails = conversation.participants
    .map((participant) => participant.email)
    .join(', ');

  // Direct chats: label with the other participant, not all emails joined
  // (same self-label pitfall as the sidebar list).
  const otherParticipant = conversation.participants.find(
    (participant) => participant.email !== currentUserEmail,
  );
  const displayName =
    conversation.title ||
    (conversation.type === 'direct' && otherParticipant?.email) ||
    participantEmails;
  const isAdmin =
    conversation.type === 'group' &&
    conversation.participants.find(
      (participant) => participant.email === currentUserEmail,
    )?.role === 'admin';
  const participantCountLabel = `${conversation.participants.length} participant${
    conversation.participants.length !== 1 ? 's' : ''
  }`;

  return (
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
  );
};

export default ChatHeader;
