import { useMemo, useState, useCallback } from 'react';
import type { ChatMessageItem } from '../types/messages';
import type { Conversation } from '../api/client';
import { isConversationUnread } from '../utils/unread';

/**
 * Owns the sidebar's unread dot + per-conversation read watermark.
 *
 * `lastMessageMap` merges real history (`messagesMap`) with the backfill
 * (`previewMap`); real history wins because it has more context and is always
 * newer or equal to the backfill. The unread rule itself is delegated to the
 * pure `isConversationUnread` helper.
 *
 * `markWatermark` lets the orchestrator advance the watermark synchronously
 * when a user opens a conversation (so the dot clears immediately, before the
 * next render from server state).
 */
export function useUnreadMap(
  conversations: Conversation[],
  currentUserId: string | null,
  messagesMap: Record<string, ChatMessageItem[]>,
  previewMap: Record<string, ChatMessageItem>,
) {
  const [watermarks, setWatermarks] = useState<Record<string, string>>({});

  const markWatermark = useCallback((conversationId: string, messageId: string) => {
    setWatermarks((prev) => ({ ...prev, [conversationId]: messageId }));
  }, []);

  const lastMessageMap = useMemo(() => {
    const map: Record<string, ChatMessageItem> = {};
    for (const conversation of conversations) {
      const messages = messagesMap[conversation.id];
      map[conversation.id] =
        messages && messages.length > 0
          ? messages[messages.length - 1]
          : previewMap[conversation.id];
    }
    return map;
  }, [conversations, messagesMap, previewMap]);

  const unreadMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const conversation of conversations) {
      const me = conversation.participants.find(
        (participant) => participant.userId === currentUserId,
      );
      const watermarkId = watermarks[conversation.id] ?? me?.lastReadMessageId ?? null;
      map[conversation.id] = isConversationUnread(
        lastMessageMap[conversation.id],
        currentUserId,
        watermarkId,
      );
    }
    return map;
  }, [conversations, lastMessageMap, watermarks, currentUserId]);

  return { unreadMap, lastMessageMap, markWatermark };
}
