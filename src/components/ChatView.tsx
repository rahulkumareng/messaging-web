import React from 'react';
import AvatarInitials from './AvatarInitials';
import type { Conversation } from '../api/client';

interface ChatViewProps {
  conversation: Conversation | null;
}

const ChatView: React.FC<ChatViewProps> = ({ conversation }) => {
  if (!conversation) {
    return (
      <div className="no-chat-selected">
        <div className="no-chat-icon">💬</div>
        <h2>Welcome to Messenger</h2>
        <p>Select a conversation from the sidebar to start chatting</p>
      </div>
    );
  }

  const participantEmails = conversation.participants
    .map((p) => p.email)
    .join(', ');

  const displayName = conversation.title || participantEmails;

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <AvatarInitials name={displayName} size="large" />
        <div className="chat-header-info">
          <h3>{displayName}</h3>
          <div className="chat-participants">
            {conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}
            {' · '}
            {participantEmails}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        <div className="chat-empty-state">
          <div className="empty-icon">✨</div>
          <h3>Messages coming soon</h3>
          <p>Real-time messaging will be wired up in the next phase</p>
        </div>
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Messaging coming soon..."
            disabled
          />
          <button className="btn-send" disabled title="Coming soon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
