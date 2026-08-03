import React from 'react';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import AvatarInitials from './AvatarInitials';
import { UsersIcon } from './icons';
import { formatTime } from '../utils/format';
import type { Conversation } from '../api/client';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  /** Last-message preview text (null/undefined → "No messages yet"). */
  preview?: string | null;
  /** Honest unread dot: newest message is incoming and newer than my read watermark. */
  hasUnread?: boolean;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  preview,
  hasUnread,
}) => {
  const currentUserId = localStorage.getItem('userId');

  // For direct chats the label must be the OTHER participant — participants[0]
  // is just whatever row came first and is often the current user's own email,
  // which makes different conversations look identical in the list.
  const otherParticipant = conversation.participants.find(
    (participant) => participant.userId !== currentUserId,
  );
  const displayName =
    conversation.title ||
    (conversation.type === 'direct'
      ? otherParticipant?.email
      : conversation.participants[0]?.email) ||
    'Unknown';

  return (
    <Box
      as="button"
      w="full"
      textAlign="start"
      display="flex"
      alignItems="center"
      gap={3.5}
      p={3}
      borderRadius="lg"
      border="2px solid"
      borderColor={isActive ? 'border.accent' : 'transparent'}
      boxShadow={isActive ? 'offset' : undefined}
      cursor="pointer"
      position="relative"
      bg={isActive ? 'bg.active' : undefined}
      _hover={{
        bg: isActive ? 'bg.active' : 'bg.hover',
        borderColor: isActive ? 'border.accent' : 'border.strong',
      }}
      aria-current={isActive ? 'true' : undefined}
      onClick={onClick}
    >
      {/* Amber "you are here" marker — the active row is the live one. */}
      {isActive && (
        <Box
          position="absolute"
          left="0"
          top="14%"
          bottom="14%"
          w="3px"
          borderRadius="full"
          bg="warm.text"
        />
      )}
      <AvatarInitials name={displayName} />
      <Flex direction="column" flex="1" minW="0" align="flex-start">
        <Text fontWeight={hasUnread ? 'bold' : 'semibold'} fontSize="sm" truncate>
          {displayName}
        </Text>
        <Text fontSize="sm" color="text.secondary" truncate>
          {preview || 'No messages yet'}
        </Text>
      </Flex>
      <VStack align="flex-end" gap={1.5} flexShrink="0">
        <Text fontSize="xs" color="text.secondary">
          {formatTime(conversation.updatedAt)}
        </Text>
        <Flex align="center" gap={1.5} minH="14px">
          {hasUnread && !isActive && <Box boxSize="8px" borderRadius="full" bg="warm.solid" border="1.5px solid" borderColor="border.ink" />}
          {conversation.type === 'group' && <UsersIcon boxSize="12px" color="text.secondary" />}
        </Flex>
      </VStack>
    </Box>
  );
};

export default ConversationItem;
