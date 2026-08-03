import React, { useEffect, useState } from 'react';
import { Alert, Badge, Box, Button, Field, Flex, Input, Text, VStack } from '@chakra-ui/react';
import AppDialog from './AppDialog';
import AvatarInitials from './AvatarInitials';
import { UserSearchField } from './UserSearchField';
import { SelectedUserChips } from './SelectedUserChips';
import { PrimaryButton } from './PrimaryButton';
import { conversationsApi, getErrorMessage } from '../api/client';
import type { User, Conversation } from '../api/client';
import { useUserSearch } from '../hooks/useUserSearch';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  conversation: Conversation;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  conversation,
}) => {
  const [groupName, setGroupName] = useState(conversation.title || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens or conversation changes.
  useEffect(() => {
    if (isOpen) {
      setGroupName(conversation.title || '');
      setSearchQuery('');
      setSelectedUsers([]);
      setError('');
    }
  }, [isOpen, conversation]);

  // Exclude already-existing participants AND just-added ones from the search.
  const existingIds = new Set(conversation.participants.map((participant) => participant.userId));
  const selectedIds = new Set(selectedUsers.map((user) => user.id));
  const excluding = new Set([...existingIds, ...selectedIds]);
  const { results, isLoading: isSearching } = useUserSearch(searchQuery, excluding);

  const handleAdd = (user: User) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery('');
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      setError('Group name cannot be empty.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      if (groupName.trim() !== conversation.title) {
        await conversationsApi.updateTitle(conversation.id, groupName.trim());
      }
      if (selectedUsers.length > 0) {
        await conversationsApi.addParticipants(
          conversation.id,
          selectedUsers.map((user) => user.id),
        );
      }
      onSuccess();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update group. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const isTitleDirty = groupName.trim() !== conversation.title;
  const hasChanges = isTitleDirty || selectedUsers.length > 0;

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Group Settings"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <PrimaryButton
            onClick={handleSave}
            loading={isSaving}
            loadingText="Saving..."
            disabled={!hasChanges}
          >
            Save Changes
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
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
      </Field.Root>

      <Field.Root mb={4}>
        <UserSearchField
          label="Add New Participants"
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={results}
          isLoading={isSearching}
          actionLabel="Add"
          onSelect={handleAdd}
        />
      </Field.Root>

      <SelectedUserChips
        users={selectedUsers}
        onRemove={(id) => setSelectedUsers((prev) => prev.filter((user) => user.id !== id))}
        label={`Users to Add (${selectedUsers.length})`}
      />

      <Box mt={6}>
        <Text fontSize="xs" fontWeight="medium" color="text.secondary" mb={3}>
          Current Participants ({conversation.participants.length})
        </Text>
        <VStack align="stretch" gap={2}>
          {conversation.participants.map((participant) => (
            <Flex key={participant.userId} align="center" gap={2.5}>
              <AvatarInitials name={participant.email} size="small" />
              <Text fontSize="sm" minW="0" truncate>
                {participant.email}
              </Text>
              {participant.role === 'admin' && (
                <Badge
                  colorPalette="warm"
                  variant="subtle"
                  fontSize="xs"
                  color={{ base: 'warm.800', _dark: 'warm.200' }}
                >
                  Admin
                </Badge>
              )}
            </Flex>
          ))}
        </VStack>
      </Box>
    </AppDialog>
  );
};

export default GroupSettingsModal;
