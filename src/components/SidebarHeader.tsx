import React from 'react';
import { Button, Flex, Heading, IconButton, Text } from '@chakra-ui/react';
import AvatarInitials from './AvatarInitials';
import { BoltIcon, LogOutIcon, UserPlusIcon, UsersIcon } from './icons';
import { ThemeToggle } from './ThemeMode';

interface SidebarHeaderProps {
  email: string;
  onOpenDirectChat: () => void;
  onOpenNewGroup: () => void;
  onLogout: () => void;
}

/**
 * The sidebar's top bar: brand mark + app name + identity avatar + theme
 * toggle + "new direct chat" / "new group" actions + logout. Sits above
 * ConversationList; everything else in the sidebar is handled by
 * ConversationList itself.
 */
const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  email,
  onOpenDirectChat,
  onOpenNewGroup,
  onLogout,
}) => (
  <Flex
    align="center"
    justify="space-between"
    px={5}
    py={4}
    borderBottom="1px solid"
    borderColor="border.subtle"
    flexShrink="0"
  >
    <Flex align="center" gap={2}>
      <BoltIcon boxSize={6} />
      <Heading as="h2" size="md" fontWeight="bold" fontFamily="display">
        Messenger
      </Heading>
    </Flex>
    <Flex align="center" gap={1}>
      <AvatarInitials name={email} size="small" />
      <ThemeToggle />
      <IconButton
        aria-label="New direct chat"
        variant="ghost"
        size="sm"
        color="text.secondary"
        _hover={{ color: 'warm.text', bg: 'warm.muted' }}
        onClick={onOpenDirectChat}
      >
        <UserPlusIcon />
      </IconButton>
      <IconButton
        aria-label="New group"
        variant="ghost"
        size="sm"
        color="text.secondary"
        _hover={{ color: 'warm.text', bg: 'warm.muted' }}
        onClick={onOpenNewGroup}
      >
        <UsersIcon />
      </IconButton>
      <Button
        variant="ghost"
        size="sm"
        gap={1.5}
        color="text.secondary"
        _hover={{ color: 'danger.solid', bg: 'danger.muted' }}
        onClick={onLogout}
      >
        <LogOutIcon boxSize={4} />
        <Text as="span" display={{ base: 'none', md: 'inline' }}>
          Logout
        </Text>
      </Button>
    </Flex>
  </Flex>
);

export default SidebarHeader;