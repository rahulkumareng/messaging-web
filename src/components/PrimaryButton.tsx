import { Button } from '@chakra-ui/react';
import type { ComponentProps } from 'react';

/**
 * Primary action button — graphite-in-light / deep-graphite-in-dark fill,
 * cartoon outline + press-down shadow, `accent.hover` on hover. Replaces
 * 8 ad-hoc copies of this exact combination across modals + auth pages.
 */
export const PrimaryButton = ({
  children,
  loadingText = 'Loading...',
  ...rest
}: ComponentProps<typeof Button> & { loadingText?: string }) => (
  <Button
    bg="accent.solid"
    color="text.inverse"
    _hover={{ bg: 'accent.hover' }}
    cartoon
    loadingText={loadingText}
    {...rest}
  >
    {children}
  </Button>
);