import React from 'react';
import AvatarInitials from './AvatarInitials';
import type { Conversation } from '../api/client';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const currentUserId = localStorage.getItem('userId');

  // For direct chats the label must be the OTHER participant — participants[0]
  // is just whatever row came first and is often the current user's own email,
  // which makes different conversations look identical in the list.
  const otherParticipant = conversation.participants.find((p) => p.userId !== currentUserId);
  const displayName =
    conversation.title ||
    (conversation.type === 'direct'
      ? otherParticipant?.email
      : conversation.participants[0]?.email) ||
    'Unknown';

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <AvatarInitials name={displayName} />
      <div className="conv-info">
        <div className="conv-title">{displayName}</div>
        <div className="conv-preview">No messages yet</div>
      </div>
      <div className="conv-meta">
        <span className="conv-time">{formatTime(conversation.updatedAt)}</span>
        <span className="conv-badge">{conversation.type}</span>
      </div>
    </div>
  );
};

export default ConversationItem;
