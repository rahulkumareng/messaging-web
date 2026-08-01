/**
 * Type support for the custom `cartoon` boolean variant added to the button
 * recipe in src/theme.ts. The variant itself resolves at runtime (recipe
 * variants merge), but Chakra's shipped Button/IconButton prop types don't
 * know about custom variants — so we widen them here.
 */
import '@chakra-ui/react';

declare module '@chakra-ui/react' {
  interface ButtonProps {
    /** Cartoon skin: 2px ink border + hard offset shadow that presses down. */
    cartoon?: boolean;
  }
}
