import React from 'react';
import ConversationItem from './ConversationItem';
import type { Conversation } from '../api/client';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conversation: Conversation) => void;
  loading: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeId,
  onSelect,
  loading,
}) => {
  if (loading) {
    return (
      <div className="conversation-list">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="conversation-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>💬</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No conversations yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {conversations.map((conv, index) => (
        <div key={conv.id} style={{ animationDelay: `${index * 50}ms` }}>
          <ConversationItem
            conversation={conv}
            isActive={activeId === conv.id}
            onClick={() => onSelect(conv)}
          />
        </div>
      ))}
    </div>
  );
};

export default ConversationList;
