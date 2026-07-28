import React, { useState, useEffect } from 'react';
import AvatarInitials from './AvatarInitials';
import { usersApi, conversationsApi } from '../api/client';
import type { User, Conversation } from '../api/client';

interface NewDirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (conversation: Conversation) => void;
}

const NewDirectChatModal: React.FC<NewDirectChatModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await usersApi.search(searchQuery);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError('');
      setCreatingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartChat = async (user: User) => {
    setError('');
    setCreatingId(user.id);

    try {
      const response = await conversationsApi.createDirect(user.id);
      onSuccess(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start conversation. Please try again.');
      setCreatingId(null);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content animate-fade-in-up">
        <div className="modal-header">
          <h2>New Direct Chat</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Search User</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {loadingSearch && <div className="search-loading">Searching...</div>}
          {!loadingSearch && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginTop: '16px' }}>
              No users found.
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(user => (
                <div key={user.id} className="search-result-item">
                  <div className="user-info-row">
                    <AvatarInitials name={user.email} size="small" />
                    <span>{user.email}</span>
                  </div>
                  <button 
                    className="btn-add" 
                    onClick={() => handleStartChat(user)}
                    disabled={creatingId === user.id}
                  >
                    {creatingId === user.id ? 'Starting...' : 'Chat'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default NewDirectChatModal;
