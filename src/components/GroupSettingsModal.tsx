import React, { useState, useEffect } from 'react';
import AvatarInitials from './AvatarInitials';
import { usersApi, conversationsApi, getErrorMessage } from '../api/client';
import type { User, Conversation } from '../api/client';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  conversation: Conversation;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({ isOpen, onClose, onSuccess, conversation }) => {
  const [groupName, setGroupName] = useState(conversation.title || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens or conversation changes
  useEffect(() => {
    if (isOpen) {
      setGroupName(conversation.title || '');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setError('');
    }
  }, [isOpen, conversation]);

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
        // Filter out already selected users and users already in the group
        const selectedIds = new Set(selectedUsers.map(u => u.id));
        const existingParticipantIds = new Set(conversation.participants.map(p => p.userId));
        
        setSearchResults(res.data.filter(u => !selectedIds.has(u.id) && !existingParticipantIds.has(u.id)));
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers, conversation.participants]);

  if (!isOpen) return null;

  const handleAddUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchResults(searchResults.filter(u => u.id !== user.id));
    setSearchQuery('');
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      setError('Group name cannot be empty.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      // If title changed, update it
      if (groupName.trim() !== conversation.title) {
        await conversationsApi.updateTitle(conversation.id, groupName.trim());
      }
      
      // If new participants added, update them
      if (selectedUsers.length > 0) {
        const participantIds = selectedUsers.map(u => u.id);
        await conversationsApi.addParticipants(conversation.id, participantIds);
      }

      onSuccess();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to update group. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content animate-fade-in-up">
        <div className="modal-header">
          <h2>Group Settings</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              className="form-input"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Add New Participants</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loadingSearch && <div className="search-loading">Searching...</div>}

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(user => (
                <div key={user.id} className="search-result-item">
                  <div className="user-info-row">
                    <AvatarInitials name={user.email} size="small" />
                    <span>{user.email}</span>
                  </div>
                  <button className="btn-add" onClick={() => handleAddUser(user)}>Add</button>
                </div>
              ))}
            </div>
          )}

          {selectedUsers.length > 0 && (
            <div className="selected-users">
              <label>Users to Add ({selectedUsers.length})</label>
              <div className="selected-list">
                {selectedUsers.map(user => (
                  <div key={user.id} className="selected-badge">
                    <span>{user.email.split('@')[0]}</span>
                    <button onClick={() => handleRemoveUser(user.id)}>&times;</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="current-participants" style={{ marginTop: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}>
              Current Participants ({conversation.participants.length})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conversation.participants.map(p => (
                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AvatarInitials name={p.email} size="small" />
                  <span style={{ fontSize: '14px' }}>{p.email}</span>
                  {p.role === 'admin' && (
                    <span style={{ fontSize: '11px', background: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || (!groupName.trim() && selectedUsers.length === 0) || (groupName.trim() === conversation.title && selectedUsers.length === 0)}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsModal;
