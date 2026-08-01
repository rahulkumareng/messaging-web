import { useMemo, useState, useCallback } from 'react';
import type { ChatMessageItem } from '../components/ChatView';
import type { Conversation } from '../api/client';
import { uuidV1Timestamp } from '../utils/uuid';

/**
 * Owns the sidebar's unread dot + per-conversation read watermark.
 *
 * `lastMessageMap` merges real history (`messagesMap`) with the backfill
 * (`previewMap`); real history wins because it has more context and is
 * always newer or equal to the backfill.
 *
 * The unread rule is intentionally one-sided: the newest message is
 * incoming AND its timeuuid timestamp is strictly greater than my read
 * watermark. Optimistic temp-ids have NaN timestamps and can never light
 * the dot.
 *
 * `markWatermark` lets the orchestrator advance the watermark synchronously
 * when a user opens a conversation (so the dot clears immediately, before
 * the next render from server state).
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
    const result: Record<string, ChatMessageItem> = {};
    for (const conv of conversations) {
      const list = messagesMap[conv.id];
      result[conv.id] = list && list.length > 0 ? list[list.length - 1] : previewMap[conv.id];
    }
    return result;
  }, [conversations, messagesMap, previewMap]);

  const unreadMap = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const conv of conversations) {
      const me = conv.participants.find((p) => p.userId === currentUserId);
      const watermarkId = watermarks[conv.id] ?? me?.lastReadMessageId ?? null;
      const wmTs = watermarkId ? uuidV1Timestamp(watermarkId) : 0;
      const last = lastMessageMap[conv.id];
      if (!last?.id) continue;

      const lastTs = uuidV1Timestamp(last.id);
      result[conv.id] =
        last.senderId !== currentUserId && !Number.isNaN(lastTs) && lastTs > wmTs;
    }
    return result;
  }, [conversations, lastMessageMap, watermarks, currentUserId]);

  return { unreadMap, lastMessageMap, markWatermark };
}