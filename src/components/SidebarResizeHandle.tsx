import React from 'react';
import { Box } from '@chakra-ui/react';

/**
 * Draggable divider between the conversation list and the chat area.
 * Pointer-capture drag (mouse/touch) + keyboard (Left/Right arrows) so the
 * resize is fully accessible: it's a `role="separator"` with aria-valuenow.
 * Desktop only — rendered by ChatPage at md+, hidden on mobile where the
 * sidebar is full-width.
 */
interface SidebarResizeHandleProps {
  width: number;
  min: number;
  max: number;
  onChange: (w: number) => void;
}

const SidebarResizeHandle: React.FC<SidebarResizeHandleProps> = ({ width, min, max, onChange }) => {
  const startRef = React.useRef<{ x: number; w: number } | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX, w: width };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    onChange(clamp(startRef.current.w + (e.clientX - startRef.current.x)));
  };

  const onPointerUp = () => {
    startRef.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(clamp(width - 20));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(clamp(width + 20));
    }
  };

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize conversation list"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      w="10px"
      flexShrink="0"
      cursor="col-resize"
      touchAction="none"
      userSelect="none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      _hover={{ bg: 'warm.muted' }}
      _active={{ bg: 'warm.muted' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'border.accent', outlineOffset: '-2px' }}
    />
  );
};

export default SidebarResizeHandle;
