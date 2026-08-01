import React, { useState } from 'react';
import { Alert, Button, Field, Input } from '@chakra-ui/react';
import AppDialog from './AppDialog';
import { UserSearchField } from './UserSearchField';
import { SelectedUserChips } from './SelectedUserChips';
import { PrimaryButton } from './PrimaryButton';
import { conversationsApi, getErrorMessage } from '../api/client';
import type { User } from '../api/client';
import { useUserSearch } from '../hooks/useUserSearch';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const selectedIds = new Set(selectedUsers.map((u) => u.id));
  const { results, loading: loadingSearch } = useUserSearch(searchQuery, selectedIds);

  const handleAdd = (user: User) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery('');
  };
  const handleRemove = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
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
      await conversationsApi.createGroup(groupName.trim(), selectedUsers.map((u) => u.id));
      setGroupName('');
      setSearchQuery('');
      setSelectedUsers([]);
      onSuccess();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create group. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Group"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <PrimaryButton
            onClick={handleCreate}
            loading={creating}
            loadingText="Creating..."
            disabled={!groupName.trim() || selectedUsers.length === 0}
          >
            Create Group
          </PrimaryButton>
        </>
      }
    >
      {error && (
        <Alert.Root status="error" mb={4}>
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      <Field.Root mb={4}>
        <Field.Label
          textTransform="uppercase"
          fontSize="xs"
          letterSpacing="0.5px"
          fontWeight="medium"
          color="text.secondary"
        >
          Group Name
        </Field.Label>
        <Input
          type="text"
          colorPalette="brand"
          bg="bg.raised"
          _placeholder={{ color: 'text.muted' }}
          borderColor={{ base: 'border.subtle', _dark: 'border.strong' }}
          placeholder="e.g. Project Launch"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
      </Field.Root>

      <Field.Root mb={4}>
        <UserSearchField
          label="Add Participants"
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={results}
          loading={loadingSearch}
          actionLabel="Add"
          onSelect={handleAdd}
        />
      </Field.Root>

      <SelectedUserChips
        users={selectedUsers}
        onRemove={handleRemove}
        label={`Selected (${selectedUsers.length})`}
      />
    </AppDialog>
  );
};

export default CreateGroupModal;