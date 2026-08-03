/**
 * Display-formatting helpers, kept out of components (oxlint
 * react/only-export-components wants component files to export only
 * components).
 */

/** Conversation-list timestamp: today → time, yesterday → "Yesterday", this week → weekday, else date. */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  // Calendar-day difference (midnight-to-midnight), not elapsed hours: a
  // message 47h old is 2 calendar days back and must not say "Yesterday".
  // Same start-of-day math as formatDayLabel below.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfMsgDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/** Chat date-separator label: Today / Yesterday / "Mon, Aug 3". */
export function formatDayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - that.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "2:30 PM" for message meta rows. */
export function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "alice@mail.com" → "alice" — sender prefix in group chats. */
export function shortEmail(email: string): string {
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
}
