import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { MessageStatusIcon } from './icons';
import type { ChatMessageItem } from '../types/messages';

interface MessageBubbleProps {
  message: ChatMessageItem;
  /** My outgoing messages: graphite fill + light outline + receipt tick. */
  isMe: boolean;
}

/**
 * One message bubble: the 2px-inked rounded box plus the receipt tick under
 * my own messages. Positioning (cluster grouping, spacing, sender label,
 * timestamp) belongs to the parent — this is the pure per-message unit.
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe }) => (
  <Flex direction="column" alignItems={isMe ? 'flex-end' : 'flex-start'}>
    <Box
      p={2.5}
      fontSize="md"
      lineHeight="1.5"
      wordBreak="break-word"
      whiteSpace="pre-wrap"
      bg={isMe ? 'accent.solid' : 'bg.raised'}
      color={isMe ? 'text.inverse' : 'text.primary'}
      border="2px solid"
      // Outline follows fill luminance: my graphite bubbles get a light
      // outline (canvas in light, ink-light in dark); theirs stay dark-ink
      // in light, ink-light in dark.
      borderColor={
        isMe
          ? { base: 'bg.canvas', _dark: 'border.ink-light' }
          : { base: 'border.ink', _dark: 'border.ink-light' }
      }
      borderRadius="xl"
    >
      {message.content}
    </Box>
    {isMe && message.status && (
      <Flex mt={0.5} pr={1}>
        <MessageStatusIcon status={message.status} />
      </Flex>
    )}
  </Flex>
);

export default MessageBubble;
