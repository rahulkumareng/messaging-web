import React, { useState, useRef, useCallback } from 'react';
import { Box, Flex, IconButton, Text, Textarea, useSafeLayoutEffect } from '@chakra-ui/react';
import { MAX_MESSAGE_LENGTH } from '../constants';
import { SendIcon } from './icons';

const MAX_INPUT_HEIGHT = 160;

interface ChatInputBarProps {
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  /** Transient notice to show above the input bar (e.g. message failed to send). */
  notice?: string | null;
}

/**
 * The compose bar: notice strip + auto-growing textarea + the amber "ready to
 * send" button + character counter. Owns the draft text state — this is the
 * "compose a message" capability, so the shell never needs to know about it.
 */
const ChatInputBar: React.FC<ChatInputBarProps> = ({ onSendMessage, isConnected, notice }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea up to MAX_INPUT_HEIGHT. Hand-rolled: Chakra v3 has
  // no built-in auto-resize textarea.
  useSafeLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [text]);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || !isConnected) return;
    onSendMessage(text.trim());
    setText('');
  }, [text, isConnected, onSendMessage]);

  // The send control is the app's energy moment: idle it stays graphite; the
  // moment you type it warms to amber — a live "ready to send" affordance.
  const canSend = Boolean(text.trim()) && isConnected;

  return (
    <Box as="form" flexShrink="0" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {notice && (
        <Box
          role="alert"
          px={{ base: 4, md: 6 }}
          py={2}
          fontSize="sm"
          color="danger.solid"
          bg="danger.muted"
          borderTop="1px solid"
          borderColor="danger.border"
        >
          {notice}
        </Box>
      )}

      <Flex
        align="flex-end"
        gap={2.5}
        px={{ base: 3, md: 6 }}
        py={3.5}
        bg="bg.surface"
        borderTop="1px solid"
        borderColor="border.subtle"
      >
        <Textarea
          ref={textareaRef}
          aria-label="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={isConnected ? 'Type a message...' : 'Connecting to chat server...'}
          disabled={!isConnected}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          resize="none"
          minH="44px"
          maxH={`${MAX_INPUT_HEIGHT}px`}
          flex="1"
          bg="bg.raised"
          borderColor={{ base: 'border.strong', _dark: 'border.ink-light' }}
          colorPalette="brand"
          _focus={{ borderColor: 'border.accent', boxShadow: 'none' }}
          _placeholder={{ color: 'text.muted' }}
        />
        <IconButton
          type="submit"
          aria-label="Send message"
          h="44px"
          w="44px"
          borderRadius="lg"
          flexShrink="0"
          bg={canSend ? 'warm.solid' : 'accent.solid'}
          color={canSend ? 'brand.700' : 'text.inverse'}
          borderColor="border.ink"
          cartoon
          _hover={{ bg: canSend ? 'warm.hover' : 'accent.hover' }}
          _active={{ bg: canSend ? 'warm.hover' : 'accent.solid' }}
          disabled={!canSend}
        >
          <SendIcon />
        </IconButton>
      </Flex>

      {text.length > MAX_MESSAGE_LENGTH - 500 && (
        <Text textAlign="right" fontSize="xs" color="text.muted" px={{ base: 3, md: 6 }} pb={2}>
          {text.length}/{MAX_MESSAGE_LENGTH}
        </Text>
      )}
    </Box>
  );
};

export default ChatInputBar;
