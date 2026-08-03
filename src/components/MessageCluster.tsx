import React from 'react';
import { Flex, Text } from '@chakra-ui/react';
import MessageBubble from './MessageBubble';
import { formatTimeOfDay } from '../utils/format';
import type { ChatMessageItem } from '../types/messages';

interface MessageClusterProps {
  messages: ChatMessageItem[];
  isMe: boolean;
  /** Group chats: show the sender's email above the cluster's first message. */
  showSender: boolean;
}

/**
 * A same-sender message cluster: optional sender label, the consecutive
 * bubbles (grouped by `buildMessageRows`' 60-second window), and one
 * timestamp for the whole group (iMessage/WhatsApp convention — one label +
 * one time per cluster, not per message).
 */
const MessageCluster: React.FC<MessageClusterProps> = ({ messages, isMe, showSender }) => {
  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];

  return (
    <Flex
      direction="column"
      maxW={{ base: '85%', md: '70%' }}
      alignSelf={isMe ? 'flex-end' : 'flex-start'}
      alignItems={isMe ? 'flex-end' : 'flex-start'}
    >
      {showSender && (
        <Text fontSize="xs" color="text.secondary" mb={1} ml={1} truncate>
          {firstMessage.senderEmail}
        </Text>
      )}
      {messages.map((message, i) => (
        <Flex
          key={message.id}
          direction="column"
          alignItems={isMe ? 'flex-end' : 'flex-start'}
          mt={i > 0 ? 0.5 : 0}
          animation="spring-in 180ms ease-out"
        >
          <MessageBubble message={message} isMe={isMe} />
        </Flex>
      ))}
      {lastMessage.createdAt && (
        <Text fontSize="xs" color="text.muted" mt={1} px={1}>
          {formatTimeOfDay(new Date(lastMessage.createdAt))}
        </Text>
      )}
    </Flex>
  );
};

export default MessageCluster;
