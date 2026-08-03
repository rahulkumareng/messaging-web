import type { FormEvent, ReactNode } from 'react';
import { Alert, Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { ThemeToggle } from './ThemeMode';
import { BoltIcon } from './icons';

/**
 * Shared shell for the auth pages (login + register): the centered card with
 * the theme toggle, brand mark, heading/subtitle, error alert, submit button
 * and the footer link. Callers supply the form fields as `children` plus the
 * submit wiring — login/register were ~90% duplicated, so the shell lives here.
 */
interface AuthCardProps {
  title: string;
  subtitle: string;
  /** Bottom "already have an account? Sign in" link block. */
  footer: ReactNode;
  error: string;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  loadingText: string;
  isLoading: boolean;
  submitDisabled: boolean;
  children: ReactNode;
}

export const AuthCard = ({
  title,
  subtitle,
  footer,
  error,
  onSubmit,
  submitLabel,
  loadingText,
  isLoading,
  submitDisabled,
  children,
}: AuthCardProps) => (
  <Flex
    minH="100dvh"
    align="center"
    justify="center"
    position="relative"
    bg="bg.canvas"
    px={4}
  >
    <Box position="absolute" top={4} right={4}>
      <ThemeToggle />
    </Box>

    <Box layerStyle="card" w="full" maxW="400px" p={10} animation="fade-in-up 400ms ease-out">
      <Flex justify="center" mb={4}>
        <BoltIcon boxSize={14} />
      </Flex>
      <Heading
        as="h1"
        fontSize="2xl"
        fontWeight="700"
        fontFamily="display"
        mb={1.5}
        textAlign="center"
      >
        {title}
      </Heading>
      <Text color="text.secondary" fontSize="sm" mb={8}>
        {subtitle}
      </Text>

      {error && (
        <Alert.Root status="error" mb={5}>
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      <form onSubmit={onSubmit}>
        {children}
        <Button
          type="submit"
          w="full"
          bg="accent.solid"
          color="text.inverse"
          _hover={{ bg: 'accent.hover' }}
          cartoon
          loading={isLoading}
          loadingText={loadingText}
          disabled={submitDisabled}
        >
          {submitLabel}
        </Button>
      </form>

      <Text textAlign="center" mt={6} fontSize="sm" color="text.secondary">
        {footer}
      </Text>
    </Box>
  </Flex>
);

export default AuthCard;
