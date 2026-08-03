/**
 * Pure helpers for shaping a message thread into render rows.
 *
 * The chat view groups consecutive same-sender messages within a short window
 * into clusters (iMessage/WhatsApp convention: one label + one timestamp per
 * group, not per message) and emits date separators between calendar days.
 * These helpers do that transformation with no React/JSX involved so they
 * are easy to unit-test and to reuse.
 */

export const CLUSTER_GAP_MS = 60_000;

/** Minimum shape `buildMessageRows` needs to cluster a thread. The helper is
 * generic over the concrete message type so callers keep every field
 * (senderEmail, content, status, …) on the returned cluster messages. */
export interface ClusterMessage {
  id: string;
  senderId?: string;
  createdAt?: string;
}

export type MessageRow<T extends ClusterMessage = ClusterMessage> =
  | { kind: 'separator'; key: string; label: string }
  | { kind: 'cluster'; key: string; messages: T[] };

export interface ClusterOptions {
  /** Override the cluster window (default CLUSTER_GAP_MS). */
  gapMs?: number;
  /** Format a date for a day separator. Required: a silent '' default would
   * render empty day separators, so callers must opt into a label explicitly. */
  formatDayLabel: (date: Date) => string;
}

/**
 * Build the render-row stream for a chat thread: day separators + 60-second
 * same-sender clusters. A day change always breaks a cluster; a sender change
 * always starts a new one. Generic in `T` so the cluster preserves the full
 * message shape the caller passed in.
 */
export function buildMessageRows<T extends ClusterMessage>(
  messages: readonly T[],
  opts: ClusterOptions,
): MessageRow<T>[] {
  const gapMs = opts.gapMs ?? CLUSTER_GAP_MS;
  const { formatDayLabel } = opts;
  const rows: MessageRow<T>[] = [];
  let lastDay = '';
  let lastCluster: Extract<MessageRow<T>, { kind: 'cluster' }> | null = null;

  for (const message of messages) {
    const day = message.createdAt ? new Date(message.createdAt).toDateString() : lastDay;
    if (day !== lastDay) {
      rows.push({
        kind: 'separator',
        key: `sep-${message.id}`,
        label: message.createdAt ? formatDayLabel(new Date(message.createdAt)) : '',
      });
      lastDay = day;
      lastCluster = null;
    }

    const prev = lastCluster?.messages[lastCluster.messages.length - 1];
    const prevGap =
      prev?.createdAt && message.createdAt
        ? new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime()
        : Infinity;

    if (lastCluster && prev && message.senderId === prev.senderId && prevGap <= gapMs) {
      lastCluster.messages.push(message);
    } else {
      const cluster: Extract<MessageRow<T>, { kind: 'cluster' }> = {
        kind: 'cluster',
        key: `cl-${message.id}`,
        messages: [message],
      };
      rows.push(cluster);
      lastCluster = cluster;
    }
  }
  return rows;
}
