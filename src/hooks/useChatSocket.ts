import { useState, useEffect, useRef, useCallback } from 'react';
import type { WSFrame } from '../types/messages';
import { WS_EVENT } from '../constants';
import { handleSessionExpired } from '../api/client';

/**
 * Build the gateway WS URL: configured `VITE_WS_URL`, else same-host `/ws`,
 * with the JWT in the query string. Pure — testable without a browser.
 *
 * Deliberate tradeoff: the JWT rides in the query string because the WebSocket
 * handshake is an HTTP GET upgrade — it cannot set Authorization headers from
 * the browser. Subprotocol- or first-frame auth are cleaner alternatives but
 * require server-side support the gateway does not provide yet. Do NOT change
 * the URL scheme without a matching server change.
 */
function buildWsUrl(token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return import.meta.env.VITE_WS_URL
    ? `${import.meta.env.VITE_WS_URL}?token=${encodeURIComponent(token)}`
    : `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}

/**
 * Owns the WebSocket connection lifecycle for the chat shell: connect with a
 * JWT in the query string, surface the connected flag + parsed frames, and
 * expose the small set of client→server sends the app uses. The handler
 * callbacks are stable (useCallback with empty deps) so a re-render never
 * tears down and re-opens the socket.
 */
export const useChatSocket = (token: string | null) => {
  const socketRef = useRef<WebSocket | null>(null);
  // Single reconnect timer — guarded so a flurry of closes only ever schedules one.
  const reconnectTimerRef = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingMessage, setIncomingMessage] = useState<WSFrame | null>(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Tear-down flag: a socket closed by the cleanup (token change / unmount /
    // dev StrictMode remount) must never schedule a reconnect for a dead effect.
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const ws = new WebSocket(buildWsUrl(token));
      socketRef.current = ws;

      ws.onopen = () => {
        // Stale socket: the effect has since replaced it (token change or dev
        // StrictMode remount). Never let the OLD socket report its state.
        if (socketRef.current !== ws) return;
        console.debug('WebSocket connected to chat-gateway');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        // Stale socket — drop frames arriving after a replacement socket opened.
        if (socketRef.current !== ws) return;
        try {
          const frame: WSFrame = JSON.parse(event.data);
          setIncomingMessage(frame);
        } catch (err) {
          console.error('Error parsing WS frame:', err);
        }
      };

      ws.onerror = (err) => {
        // Stale socket — ignore errors surfacing from a replaced connection.
        if (socketRef.current !== ws) return;
        console.error('WebSocket error:', err);
      };

      ws.onclose = (event) => {
        // Stale socket: this close belongs to the OLD connection (e.g. the
        // StrictMode unmount close racing the new socket's onopen). Ignoring it
        // keeps isConnected true and — critically — never runs the 1008
        // redirect/wipe for a socket that is no longer the live one.
        if (socketRef.current !== ws) return;
        setIsConnected(false);
        // Clear any last frame from this socket now that it's gone (only the
        // current socket reaches this point, so no stale-frame clearing of a
        // live connection).
        setIncomingMessage(null);
        // Intentionally torn down (token change / unmount) — never reconnect.
        if (disposed) return;
        // 1008 = rejected at the handshake (missing/invalid/expired token).
        // Session is dead — bounce to login like the REST 401 interceptor does.
        if (event.code === 1008 && token) {
          handleSessionExpired();
          return;
        }
        // Any other close (server restart, network blip, gateway hiccup) →
        // reconnect after a short delay, keeping the session alive. Guarded so
        // only one timer is ever pending.
        if (reconnectTimerRef.current != null) return;
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, 1000);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [token]);

  const sendRaw = useCallback((payload: unknown): boolean => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.error('Cannot send: WebSocket is not connected');
      return false;
    }
    socketRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  /** Send a new chat message (Kafka-first: Gateway will ACK after Kafka publish). */
  const sendMessage = useCallback(
    (conversationId: string, content: string, clientMessageId: string): boolean => {
      return sendRaw({
        event: WS_EVENT.Message,
        data: { conversationId, content, clientMessageId },
      });
    },
    [sendRaw],
  );

  /** Mark all messages in a conversation as read (triggers blue tick). */
  const markAsRead = useCallback(
    (conversationId: string, lastReadMessageId: string): boolean => {
      return sendRaw({ event: WS_EVENT.MarkRead, data: { conversationId, lastReadMessageId } });
    },
    [sendRaw],
  );

  /**
   * Acknowledge delivery of a received message (triggers the sender's gray ✓✓).
   * Sent only after the `message_received` frame has actually been processed by
   * this client — a socket that's open but throttled (e.g. DevTools offline)
   * never acks, so the sender stays at one tick until genuine delivery.
   */
  const sendMessageDelivered = useCallback(
    (conversationId: string, messageId: string): boolean => {
      return sendRaw({ event: WS_EVENT.MessageDelivered, data: { conversationId, messageId } });
    },
    [sendRaw],
  );

  return {
    isConnected,
    incomingMessage,
    sendMessage,
    markAsRead,
    sendMessageDelivered,
  };
};
