import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ConversationList from '../components/ConversationList';
import ChatView from '../components/ChatView';
import AvatarInitials from '../components/AvatarInitials';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupSettingsModal from '../components/GroupSettingsModal';
import NewDirectChatModal from '../components/NewDirectChatModal';
import { conversationsApi, messagesApi } from '../api/client';
import type { Conversation } from '../api/client';
import { useChatSocket } from '../hooks/useChatSocket';
import type { ChatMessageItem } from '../components/ChatView';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessageItem[]>>({});

  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email') || '';
  const currentUserId = localStorage.getItem('userId');

  const { isConnected, incomingMessage, sendMessage } = useChatSocket(token);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await conversationsApi.getAll();
      setConversations(response.data);
      
      setActiveConversation(prev => {
        if (!prev) return null;
        const updated = response.data.find(c => c.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch message history whenever active conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const convId = activeConversation.id;
    messagesApi.getMessages(convId, 20)
      .then(res => {
        const fetchedMessages = res.data.messages || [];
        const historyMsgs: ChatMessageItem[] = fetchedMessages.map(m => {
          const participant = activeConversation.participants.find(p => p.userId === m.senderId);
          return {
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            senderEmail: participant?.email,
            content: m.content,
            createdAt: m.createdAt,
            status: 'delivered' as const,
          };
        });

        setMessagesMap(prev => ({
          ...prev,
          [convId]: historyMsgs,
        }));
      })
      .catch(err => {
        console.error('Failed to fetch message history:', err);
      });
  }, [activeConversation?.id]);

  // Handle incoming WS frames
  useEffect(() => {
    if (!incomingMessage) return;

    const { event, data } = incomingMessage;

    if (event === 'message_sent') {
      // Sender ACK: Update status of local optimistic message from 'sending' -> 'sent'
      setMessagesMap(prev => {
        const convMessages = prev[data.conversationId] || [];
        const updated = convMessages.map(m => {
          if (m.clientMessageId === data.clientMessageId) {
            return { ...m, id: data.messageId || m.id, status: 'sent' as const };
          }
          return m;
        });
        return { ...prev, [data.conversationId]: updated };
      });
    } else if (event === 'message_delivered') {
      // Delivery ACK: Update status from 'sent' -> 'delivered'
      setMessagesMap(prev => {
        const convMessages = prev[data.conversationId] || [];
        const updated = convMessages.map(m => {
          if (m.clientMessageId === data.clientMessageId) {
            return { ...m, status: 'delivered' as const };
          }
          return m;
        });
        return { ...prev, [data.conversationId]: updated };
      });
    } else if (event === 'message_received') {
      // Incoming message from another user
      setMessagesMap(prev => {
        const convMessages = prev[data.conversationId] || [];
        // Avoid duplicate rendering
        if (convMessages.some(m => m.id === data.messageId)) return prev;

        const senderParticipant = conversations
          .flatMap(c => c.participants)
          .find(p => p.userId === data.senderId);

        const newMsg: ChatMessageItem = {
          id: data.messageId || `msg-${Date.now()}`,
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderEmail: senderParticipant?.email,
          content: data.content,
          createdAt: data.createdAt || new Date().toISOString(),
          status: 'delivered',
        };

        return {
          ...prev,
          [data.conversationId]: [...convMessages, newMsg],
        };
      });
    }
  }, [incomingMessage, conversations]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    navigate('/login', { replace: true });
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const handleSendMessage = (content: string) => {
    if (!activeConversation) return;

    const clientMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // 1. Optimistically append message locally
    const optimisticMsg: ChatMessageItem = {
      id: clientMessageId,
      clientMessageId,
      conversationId: activeConversation.id,
      senderId: currentUserId || '',
      senderEmail: email,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessagesMap(prev => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), optimisticMsg],
    }));

    // 2. Dispatch to WebSocket
    sendMessage(activeConversation.id, content, clientMessageId);
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

  const activeMessages = activeConversation ? (messagesMap[activeConversation.id] || []) : [];

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Messenger</h2>
          <div className="sidebar-user-info">
            <AvatarInitials name={email} size="small" />
            
            <button className="btn-icon" onClick={() => setIsDirectModalOpen(true)} title="New Direct Chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>

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
        messages={activeMessages}
        onSendMessage={handleSendMessage}
        isConnected={isConnected}
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
