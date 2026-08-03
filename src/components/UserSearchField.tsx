import { Box, Button, Flex, Input, InputGroup, Separator, Stack, Text } from '@chakra-ui/react';
import { SearchIcon } from './icons';
import AvatarInitials from './AvatarInitials';
import type { User } from '../api/client';

/**
 * Debounced user-search input + result list. Used by all three modals that
 * need to find users (create-group, edit-group, new-direct-chat). The hook
 * lives in `hooks/useUserSearch`; this component just renders the controlled
 * input + the list of matches.
 */
interface UserSearchFieldProps {
  query: string;
  onQueryChange: (q: string) => void;
  results: User[];
  isLoading: boolean;
  /** What to render in the action slot for each result row ("Add", "Chat"). */
  actionLabel: string;
  /** Called when the user clicks the row's action button. */
  onSelect: (user: User) => void;
  /** Optional: disable the action button for specific user ids (e.g. self). */
  disabledUserIds?: ReadonlySet<string>;
  /** Optional: this user's row is in a loading state (e.g. per-row loading). */
  loadingUserId?: string | null;
  /** Label shown next to the action button while loading. */
  loadingText?: string;
  /** Optional label rendered above the input. */
  label?: string;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** When true, the input is auto-focused on mount. */
  autoFocus?: boolean;
}

export const UserSearchField = ({
  query,
  onQueryChange,
  results,
  isLoading,
  actionLabel,
  onSelect,
  disabledUserIds,
  loadingUserId = null,
  loadingText = 'Loading...',
  label,
  placeholder = 'Search by email...',
  autoFocus = false,
}: UserSearchFieldProps) => (
  <>
    {label && (
      <Text
        textTransform="uppercase"
        fontSize="xs"
        letterSpacing="0.5px"
        fontWeight="medium"
        color="text.secondary"
        mb={1.5}
      >
        {label}
      </Text>
    )}
    <InputGroup startElement={<SearchIcon color="text.muted" />}>
      <Input
        type="text"
        colorPalette="brand"
        bg="bg.raised"
        _placeholder={{ color: 'text.muted' }}
        borderColor={{ base: 'border.subtle', _dark: 'border.strong' }}
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        autoFocus={autoFocus}
      />
    </InputGroup>

    {isLoading && (
      <Text fontSize="sm" color="text.muted" mt={2}>
        Searching...
      </Text>
    )}

    {!isLoading && query.trim().length >= 2 && results.length === 0 && (
      <Text fontSize="sm" color="text.secondary" textAlign="center" mt={4}>
        No users found.
      </Text>
    )}

    {results.length > 0 && (
      <Box
        mt={2}
        border="1px solid"
        borderColor={{ base: 'border.subtle', _dark: 'border.strong' }}
        borderRadius="md"
        maxH="200px"
        overflowY="auto"
      >
        <Stack gap={0} separator={<Separator />}>
          {results.map((user) => {
            const isDisabled = disabledUserIds?.has(user.id) ?? false;
            return (
              <Flex key={user.id} align="center" justify="space-between" p={3} gap={3}>
                <Flex align="center" gap={3} minW="0">
                  <AvatarInitials name={user.email} size="small" />
                  <Text fontSize="sm" truncate>
                    {user.email}
                  </Text>
                </Flex>
                <Button
                  size="xs"
                  colorScheme="brand"
                  variant="subtle"
                  disabled={isDisabled}
                  loading={loadingUserId === user.id}
                  loadingText={loadingText}
                  onClick={() => onSelect(user)}
                >
                  {actionLabel}
                </Button>
              </Flex>
            );
          })}
        </Stack>
      </Box>
    )}
  </>
);