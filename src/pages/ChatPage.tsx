import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ConversationList from '../components/ConversationList';
import ChatView from '../components/ChatView';
import AvatarInitials from '../components/AvatarInitials';
import CreateGroupModal from '../components/CreateGroupModal';
import { conversationsApi } from '../api/client';
import type { Conversation } from '../api/client';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const email = localStorage.getItem('email') || '';

  const fetchConversations = useCallback(async () => {
    try {
      const response = await conversationsApi.getAll();
      setConversations(response.data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    navigate('/login', { replace: true });
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const handleGroupCreated = () => {
    setIsModalOpen(false);
    fetchConversations();
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Messenger</h2>
          <div className="sidebar-user-info">
            <AvatarInitials name={email} size="small" />
            <button className="btn-icon" onClick={() => setIsModalOpen(true)} title="New Group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeConversation?.id || null}
          onSelect={handleSelectConversation}
          loading={loading}
        />
      </div>

      {/* Chat Area */}
      <ChatView conversation={activeConversation} />

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleGroupCreated}
      />
    </div>
  );
};

export default ChatPage;
