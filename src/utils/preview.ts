/**
 * Pure shaping of a single server message into a sidebar preview row. The
 * fetching/guarding lives in usePreviewMap; only the shape transformation is
 * extracted here so it can be reused and unit-tested.
 */
import type { ChatMessageItem } from '../types/messages';
import type { ChatMessage } from '../api/client';

/** Map a server history message to a lightweight preview item (status 'delivered'). */
export function toPreviewItem(message: ChatMessage): ChatMessageItem {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt,
    status: 'delivered',
  };
}
