import React, { useState, useEffect, useRef } from 'react';
import AvatarInitials from './AvatarInitials';
import type { Conversation } from '../api/client';
import type { WSMessageData } from '../hooks/useChatSocket';

export interface ChatMessageItem extends WSMessageData {
  id: string;
  senderEmail?: string;
}

interface ChatViewProps {
  conversation: Conversation | null;
  onOpenSettings?: () => void;
  messages: ChatMessageItem[];
  onSendMessage: (content: string) => void;
  isConnected: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onOpenSettings,
  messages,
  onSendMessage,
  isConnected,
}) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = localStorage.getItem('userId');
  const currentUserEmail = localStorage.getItem('email');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
  const isAdmin =
    conversation.type === 'group' &&
    conversation.participants.find((p) => p.email === currentUserEmail)?.role === 'admin';

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !isConnected) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <AvatarInitials name={displayName} size="large" />
        <div className="chat-header-info" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3>{displayName}</h3>
            {isAdmin && (
              <button
                className="btn-icon"
                onClick={onOpenSettings}
                title="Group Settings"
                style={{ padding: '4px' }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            )}
          </div>
          <div className="chat-participants">
            {conversation.type === 'group' ? (
              <>
                {conversation.participants.length} participant
                {conversation.participants.length !== 1 ? 's' : ''}
              </>
            ) : (
              <>Direct Message</>
            )}
            {' · '}
            {participantEmails}
          </div>
        </div>
        <div
          className={`connection-badge ${isConnected ? 'online' : 'offline'}`}
          style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: isConnected ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            color: isConnected ? '#34a853' : '#ea4335',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#34a853' : '#ea4335',
            }}
          />
          {isConnected ? 'Connected' : 'Connecting...'}
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="empty-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`message-wrapper ${isMe ? 'outgoing' : 'incoming'}`}
              >
                {!isMe && msg.senderEmail && (
                  <span className="message-sender">{msg.senderEmail}</span>
                )}
                <div className="message-bubble">{msg.content}</div>
                <div style={{ fontSize: '10px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', color: '#8a8d91' }}>
                  {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && msg.status && (
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {msg.status === 'sending' && (
                        <span title="Sending" style={{ color: '#8a8d91' }}>🕒</span>
                      )}
                      {msg.status === 'sent' && (
                        <span title="Sent" style={{ color: '#8a8d91', fontWeight: 'bold' }}>✓</span>
                      )}
                      {msg.status === 'delivered' && (
                        <span title="Delivered" style={{ color: '#8a8d91', fontWeight: 'bold', letterSpacing: '-2px' }}>✓✓</span>
                      )}
                      {msg.status === 'read' && (
                        <span title="Read" style={{ color: '#0084ff', fontWeight: 'bold', letterSpacing: '-2px' }}>✓✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form className="chat-input-bar" onSubmit={handleSend}>
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder={
              isConnected ? 'Type a message...' : 'Connecting to chat server...'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!isConnected}
          />
          <button
            className="btn-send"
            type="submit"
            disabled={!text.trim() || !isConnected}
            title="Send Message"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatView;