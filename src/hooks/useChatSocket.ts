import { useState, useEffect, useRef, useCallback } from 'react';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface WSMessageData {
  messageId?: string;
  conversationId: string;
  senderId?: string;
  content: string;
  createdAt?: string;
  clientMessageId?: string;
  status?: MessageStatus;
  // delivered/read receipt fields
  recipientId?: string;
  deliveredAt?: string;
  lastReadMessageId?: string;
  readerId?: string;
  readAt?: string;
  deliveredCount?: number;
}

interface WSFrame {
  event: string;
  data: WSMessageData;
}

export const useChatSocket = (token: string | null) => {
  const socketRef = useRef<WebSocket | null>(null);
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

    const wsUrl = `ws://localhost:8080?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket Connected to chat-gateway');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const frame: WSFrame = JSON.parse(event.data);
        console.log('📩 WS Event received:', frame);
        setIncomingMessage(frame);
      } catch (err) {
        console.error('Error parsing WS frame:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket Error:', err);
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket Disconnected:', event.reason);
      setIsConnected(false);
    };

    return () => {
      ws.close();
      socketRef.current = null;
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
      return sendRaw({ event: 'message', data: { conversationId, content, clientMessageId } });
    },
    [sendRaw],
  );

  /** Acknowledge message delivery (sent automatically after receiving message_received). */
  const ackDelivered = useCallback(
    (conversationId: string, messageId: string): boolean => {
      return sendRaw({ event: 'message_delivered', data: { conversationId, messageId } });
    },
    [sendRaw],
  );

  /** Mark all messages in a conversation as read (triggers blue tick). */
  const markAsRead = useCallback(
    (conversationId: string, lastReadMessageId: string): boolean => {
      return sendRaw({ event: 'mark_read', data: { conversationId, lastReadMessageId } });
    },
    [sendRaw],
  );

  return {
    isConnected,
    incomingMessage,
    sendMessage,
    ackDelivered,
    markAsRead,
  };
};
