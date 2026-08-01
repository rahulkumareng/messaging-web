import { useEffect, useState } from 'react';
import type { ChatMessage, Conversation } from '../api/client';
import { messagesApi } from '../api/client';
import type { ChatMessageItem } from '../components/ChatView';

/**
 * Module-scope guard: one preview backfill per conversation, ever. Survives
 * StrictMode's dev double-mount — each conversation costs exactly one
 * `GET /messages/:id?limit=1` per page session.
 */
const previewFetchGuard = new Set<string>();

/**
 * Owns the sidebar's last-message preview backfill. For every conversation
 * that has no real history loaded, fetches the latest single message so the
 * sidebar shows a real preview instead of "No messages yet". Real history
 * (added by `useMessages`) supersedes the backfill, so this stays simple —
 * one fetch, one cache entry, never re-fetched.
 */
export function usePreviewMap(
  conversations: Conversation[],
  messagesMap: Record<string, ChatMessageItem[]>,
) {
  const [previewMap, setPreviewMap] = useState<Record<string, ChatMessageItem>>({});

  useEffect(() => {
    for (const conv of conversations) {
      if (messagesMap[conv.id]?.length) continue; // real data already present
      if (previewFetchGuard.has(conv.id)) continue;
      previewFetchGuard.add(conv.id);

      messagesApi
        .getMessages(conv.id, 1)
        .then((res) => {
          const m: ChatMessage | undefined = res.data.messages?.[0];
          if (m) {
            setPreviewMap((prev) => ({
              ...prev,
              [conv.id]: {
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                content: m.content,
                createdAt: m.createdAt,
                status: 'delivered' as const,
              },
            }));
          }
        })
        .catch(() => {
          // Silent: preview stays at "No messages yet".
        });
    }
  }, [conversations, messagesMap]);

  return previewMap;
}