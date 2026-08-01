import React, { useEffect, useState } from 'react';
import { Alert, Button, Field } from '@chakra-ui/react';
import AppDialog from './AppDialog';
import { UserSearchField } from './UserSearchField';
import { conversationsApi, getErrorMessage } from '../api/client';
import type { User, Conversation } from '../api/client';
import { useUserSearch } from '../hooks/useUserSearch';

interface NewDirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (conversation: Conversation) => void;
}

const NewDirectChatModal: React.FC<NewDirectChatModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Reset state when the modal opens (search results should NOT persist across
  // sessions — pre-existing behavior).
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setError('');
      setCreatingId(null);
    }
  }, [isOpen]);

  const { results, loading } = useUserSearch(searchQuery, []);

  const handleStartChat = async (user: User) => {
    setError('');
    setCreatingId(user.id);
    try {
      const response = await conversationsApi.createDirect(user.id);
      onSuccess(response.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to start conversation. Please try again.'));
      setCreatingId(null);
    }
  };

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title="New Direct Chat"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {error && (
        <Alert.Root status="error" mb={4}>
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      <Field.Root mb={4}>
        <UserSearchField
          label="Search User"
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={results}
          loading={loading}
          actionLabel="Chat"
          loadingText="Starting..."
          loadingUserId={creatingId}
          onSelect={handleStartChat}
          autoFocus
        />
      </Field.Root>
    </AppDialog>
  );
};

export default NewDirectChatModal;