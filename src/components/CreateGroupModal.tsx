import React, { useState, useEffect } from 'react';
import AvatarInitials from './AvatarInitials';
import { usersApi, conversationsApi, getErrorMessage } from '../api/client';
import type { User } from '../api/client';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [creating, setCreating] = useState(false);
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
        // Filter out already selected users
        const selectedIds = new Set(selectedUsers.map(u => u.id));
        setSearchResults(res.data.filter(u => !selectedIds.has(u.id)));
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers]);

  if (!isOpen) return null;

  const handleAddUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchResults(searchResults.filter(u => u.id !== user.id));
    setSearchQuery('');
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('Please provide a group name.');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one participant.');
      return;
    }

    setError('');
    setCreating(true);

    try {
      const participantIds = selectedUsers.map(u => u.id);
      await conversationsApi.createGroup(groupName.trim(), participantIds);
      
      // Reset form
      setGroupName('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      onSuccess();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to create group. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content animate-fade-in-up">
        <div className="modal-header">
          <h2>Create New Group</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Project Launch 🚀"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Add Participants</label>
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
              <label>Selected ({selectedUsers.length})</label>
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
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selectedUsers.length === 0}
          >
            {creating ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
