import type { Conversation, ConversationParticipant } from '../api/client';

/**
 * Resolve the display name for a conversation, shared by the sidebar item and
 * the chat header (which used to duplicate this with divergent self-matching:
 * one matched by `userId`, the other by `email`).
 *
 * Order:
 * 1. explicit `conversation.title` (groups),
 * 2. direct chat → the OTHER participant (matched against BOTH self ids so a
 *    user id and an email both work, whichever is present),
 * 3. fallback → all participant emails joined.
 *
 * `selfUserId` / `selfEmail` may each be null — the matching only constrains
 * the ids it actually has, so partial identity never excludes the wrong row.
 */
export function getDisplayName(
  conversation: Conversation,
  selfUserId: string | null,
  selfEmail: string | null,
): string {
  if (conversation.title) return conversation.title;

  const participants = conversation.participants;
  const isSelf = (participant: ConversationParticipant) =>
    (selfUserId != null && selfUserId !== '' && participant.userId === selfUserId) ||
    (selfEmail != null && selfEmail !== '' && participant.email === selfEmail);

  if (conversation.type === 'direct') {
    const other = participants.find((participant) => !isSelf(participant));
    return other?.email || participants.map((participant) => participant.email).join(', ');
  }

  return participants.map((participant) => participant.email).join(', ') || 'Unknown';
}
