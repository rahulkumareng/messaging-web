import { Box, Tag, Text, Wrap } from '@chakra-ui/react';
import type { User } from '../api/client';

/**
 * Read-only display of selected-user chips with a close trigger per chip.
 * Used by the create-group + edit-group modals.
 */
interface SelectedUserChipsProps {
  users: User[];
  onRemove: (userId: string) => void;
  label: string;
}

export const SelectedUserChips = ({ users, onRemove, label }: SelectedUserChipsProps) => {
  if (users.length === 0) return null;
  return (
    <Box mt={6}>
      <Text fontSize="xs" fontWeight="medium" color="text.secondary" mb={3}>
        {label}
      </Text>
      <Wrap>
        {users.map((user) => (
          <Tag.Root key={user.id} variant="subtle" colorPalette="brand" size="md">
            <Tag.Label>{user.email.split('@')[0]}</Tag.Label>
            <Tag.CloseTrigger onClick={() => onRemove(user.id)} />
          </Tag.Root>
        ))}
      </Wrap>
    </Box>
  );
};