import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConversationList from '../components/ConversationList';
import ChatView from '../components/ChatView';
import AvatarInitials from '../components/AvatarInitials';
import { conversationsApi } from '../api/client';
import type { Conversation } from '../api/client';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  const email = localStorage.getItem('email') || '';

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await conversationsApi.getAll();
        setConversations(response.data);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    navigate('/login', { replace: true });
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Messenger</h2>
          <div className="sidebar-user-info">
            <AvatarInitials name={email} size="small" />
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
    </div>
  );
};

export default ChatPage;
