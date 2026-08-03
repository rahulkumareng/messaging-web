/**
 * Pure unread-flag derivation for the sidebar. A conversation is unread when
 * its newest message is incoming AND newer than my read watermark.
 */
import { uuidV1Timestamp } from './uuid';

/** The last-known message shape the unread rule needs. */
export interface UnreadCandidate {
  id: string;
  senderId?: string;
}

/**
 * Is this conversation unread for me? `watermarkId` is the highest message id
 * I've read (a v1 timeuuid, or null/undefined if I've never read it).
 */
export function isConversationUnread(
  last: UnreadCandidate | undefined,
  myId: string | null,
  watermarkId?: string | null,
): boolean {
  if (!last?.id) return false;
  const lastTs = uuidV1Timestamp(last.id);
  if (Number.isNaN(lastTs)) return false; // optimistic/local ids never light the dot
  if (last.senderId === myId) return false; // my own last message means I've seen it
  const wmTs = watermarkId ? uuidV1Timestamp(watermarkId) : 0;
  return lastTs > wmTs;
}
