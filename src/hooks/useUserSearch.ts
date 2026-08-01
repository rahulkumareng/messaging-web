import { useEffect, useState } from 'react';
import { usersApi } from '../api/client';
import type { User } from '../api/client';

/**
 * Debounced user search.
 *
 * Returns matches for `query` once it crosses `minChars` (default 2), debounced
 * by `debounceMs` (default 500). `excludeIds` are filtered out of the results
 * — used to hide already-selected or already-member users.
 *
 * Shared by the create-group, edit-group, and new-direct-chat modals; before
 * each one carried its own copy of this state machine.
 */
export function useUserSearch(
  query: string,
  excludeIds: ReadonlySet<string> | string[],
  opts: { minChars?: number; debounceMs?: number } = {},
) {
  const { minChars = 2, debounceMs = 500 } = opts;
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minChars) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await usersApi.search(trimmed);
        const excludes = excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
        setResults(res.data.filter((u) => !excludes.has(u.id)));
      } catch (err) {
        console.error('Failed to search users:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
    // excludeIds is intentionally NOT in deps: callers typically pass a fresh
    // Set from a derived selector each render and re-running on it would
    // spam the API. If you ever need it to react, wrap the Set with useMemo.
  }, [query, minChars, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { results, loading };
}