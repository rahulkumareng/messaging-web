import type { ReactNode } from 'react';
import { Dialog } from '@chakra-ui/react';

interface AppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared modal chrome for all app dialogs: dimmed backdrop, cartoon card
 * (2px ink border + hard offset shadow via layerStyle.card), title + close
 * trigger, body, footer. Dialog owns focus trapping, Escape-to-close and
 * scroll locking.
 */
const AppDialog = ({ isOpen, onClose, title, children, footer }: AppDialogProps) => (
  <Dialog.Root
    open={isOpen}
    onOpenChange={(e) => {
      if (!e.open) onClose();
    }}
  >
    <Dialog.Backdrop bg="blackAlpha.500" />
    <Dialog.Positioner>
      <Dialog.Content layerStyle="card">
        <Dialog.Header>
          <Dialog.Title fontSize="lg" fontWeight="semibold">
            {title}
          </Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body>{children}</Dialog.Body>
        {footer && <Dialog.Footer>{footer}</Dialog.Footer>}
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
);

export default AppDialog;
