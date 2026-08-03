import React from 'react';
import { EmptyState } from '@chakra-ui/react';
import { ChatArt } from './icons';

interface ChatEmptyStateProps {
  title: string;
  description: string;
}

/**
 * The shared empty-state illustration block for the chat column — used for
 * both "no conversation selected" (full canvas) and "no messages yet" (inside
 * the thread). Callers wrap it in whatever layout they need.
 */
const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ title, description }) => (
  <EmptyState.Root>
    <EmptyState.Indicator>
      <ChatArt boxSize="88px" />
    </EmptyState.Indicator>
    <EmptyState.Title>{title}</EmptyState.Title>
    <EmptyState.Description>{description}</EmptyState.Description>
  </EmptyState.Root>
);

export default ChatEmptyState;
