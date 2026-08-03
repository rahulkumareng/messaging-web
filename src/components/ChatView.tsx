import React from 'react';
import { Flex } from '@chakra-ui/react';
import ChatHeader from './ChatHeader';
import ChatMessageThread from './ChatMessageThread';
import ChatInputBar from './ChatInputBar';
import ChatEmptyState from './ChatEmptyState';
import type { Conversation } from '../api/client';
import type { ChatMessageItem } from '../types/messages';

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

/**
 * The chat column: a thin shell that composes the three regions (header,
 * message thread, input bar) and shows the welcome state when no
 * conversation is selected. Each region owns its own state and scroll
 * behavior — this component is a pure UI description.
 */
const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onOpenSettings,
  messages,
  onSendMessage,
  isConnected,
  notice,
  onBack,
}) => {
  const currentUserId = localStorage.getItem('userId');
  const currentUserEmail = localStorage.getItem('email') || '';

  if (!conversation) {
    return (
      <Flex flex="1" direction="column" align="center" justify="center" bg="bg.canvas">
        <ChatEmptyState
          title="Welcome to Messenger"
          description="Pick a conversation from the sidebar to start chatting"
        />
      </Flex>
    );
  }

  return (
    <Flex flex="1" direction="column" minW="0" minH="0" bg="bg.canvas">
      <ChatHeader
        conversation={conversation}
        currentUserEmail={currentUserEmail}
        isConnected={isConnected}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
      />
      <ChatMessageThread
        conversationId={conversation.id}
        messages={messages}
        currentUserId={currentUserId}
        isGroup={conversation.type === 'group'}
      />
      <ChatInputBar onSendMessage={onSendMessage} isConnected={isConnected} notice={notice} />
    </Flex>
  );
};

export default ChatView;
