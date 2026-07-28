import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ConversationList from '../components/ConversationList';
import ChatView from '../components/ChatView';
import AvatarInitials from '../components/AvatarInitials';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupSettingsModal from '../components/GroupSettingsModal';
import NewDirectChatModal from '../components/NewDirectChatModal';
import { conversationsApi } from '../api/client';
import type { Conversation } from '../api/client';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const email = localStorage.getItem('email') || '';

  const fetchConversations = useCallback(async () => {
    try {
      const response = await conversationsApi.getAll();
      setConversations(response.data);
      
      // Update active conversation reference if it exists
      if (activeConversation) {
        const updated = response.data.find(c => c.id === activeConversation.id);
        if (updated) setActiveConversation(updated);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [activeConversation]);

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
    setIsGroupModalOpen(false);
    fetchConversations();
  };

  const handleDirectCreated = (conversation: Conversation) => {
    setIsDirectModalOpen(false);
    setActiveConversation(conversation);
    fetchConversations();
  };

  const handleSettingsUpdated = () => {
    setIsSettingsModalOpen(false);
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
            
            {/* New Direct Chat Button */}
            <button className="btn-icon" onClick={() => setIsDirectModalOpen(true)} title="New Direct Chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>

            {/* New Group Button */}
            <button className="btn-icon" onClick={() => setIsGroupModalOpen(true)} title="New Group">
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
      <ChatView 
        conversation={activeConversation} 
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSuccess={handleGroupCreated}
      />

      <NewDirectChatModal
        isOpen={isDirectModalOpen}
        onClose={() => setIsDirectModalOpen(false)}
        onSuccess={handleDirectCreated}
      />

      {activeConversation && activeConversation.type === 'group' && (
        <GroupSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onSuccess={handleSettingsUpdated}
          conversation={activeConversation}
        />
      )}
    </div>
  );
};

export default ChatPage;
