import { useEffect, useState } from 'react';
import type { Conversation } from '../api/client';
import { messagesApi } from '../api/client';
import { PREVIEW_FETCH_LIMIT } from '../constants';
import type { ChatMessageItem } from '../types/messages';
import { toPreviewItem } from '../utils/preview';

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
 * one fetch, one cache entry, never re-fetched. The message→preview shaping
 * is delegated to the pure `toPreviewItem`.
 */
export function usePreviewMap(
  conversations: Conversation[],
  messagesMap: Record<string, ChatMessageItem[]>,
) {
  const [previewMap, setPreviewMap] = useState<Record<string, ChatMessageItem>>({});

  useEffect(() => {
    let cancelled = false;
    for (const conversation of conversations) {
      if (messagesMap[conversation.id]?.length) continue; // real data already present
      if (previewFetchGuard.has(conversation.id)) continue;

      messagesApi
        .fetchMessages(conversation.id, PREVIEW_FETCH_LIMIT)
        .then((res) => {
          if (cancelled) return;
          // Only a SUCCESSFUL fetch claims the conversation — a transient
          // network failure leaves the guard unset so the next run retries the
          // backfill instead of permanently blocking the preview this session.
          previewFetchGuard.add(conversation.id);
          const message = res.data.messages?.[0];
          if (message) {
            setPreviewMap((prev) => ({
              ...prev,
              [conversation.id]: toPreviewItem(message),
            }));
          }
        })
        .catch(() => {
          // Silent fallback: preview stays at "No messages yet".
        });
    }
    return () => {
      cancelled = true;
    };
  }, [conversations, messagesMap]);

  return previewMap;
}
