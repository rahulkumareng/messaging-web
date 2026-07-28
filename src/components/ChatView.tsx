import React from 'react';
import AvatarInitials from './AvatarInitials';
import type { Conversation } from '../api/client';

interface ChatViewProps {
  conversation: Conversation | null;
  onOpenSettings?: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ conversation, onOpenSettings }) => {
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
  
  const currentUserEmail = localStorage.getItem('email');
  const isAdmin = conversation.type === 'group' && conversation.participants.find(p => p.email === currentUserEmail)?.role === 'admin';

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <AvatarInitials name={displayName} size="large" />
        <div className="chat-header-info" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3>{displayName}</h3>
            {isAdmin && (
              <button className="btn-icon" onClick={onOpenSettings} title="Group Settings" style={{ padding: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            )}
          </div>
          <div className="chat-participants">
            {conversation.type === 'group' ? (
              <>{conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}</>
            ) : (
              <>Direct Message</>
            )}
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
