import type { ComponentProps, FC } from 'react';
import { Link, type LinkProps } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Chakra-styled link that accepts react-router's `to` prop.
 * Chakra's `as` polymorphic prop doesn't widen the prop types, so this typed
 * bridge is required to pass `to` through.
 */
export const AppLink: FC<ComponentProps<typeof RouterLink> & LinkProps> = (props) => (
  <Link as={RouterLink} {...props} />
);
