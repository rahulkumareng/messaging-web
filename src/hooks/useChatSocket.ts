import { useState, useEffect, useRef, useCallback } from 'react';

export interface WSMessageData {
  messageId?: string;
  conversationId: string;
  senderId?: string;
  content: string;
  createdAt?: string;
  clientMessageId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
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

  const sendMessage = useCallback((conversationId: string, content: string, clientMessageId: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not connected');
      return false;
    }

    const payload = {
      event: 'message',
      data: {
        conversationId,
        content,
        clientMessageId,
      },
    };

    socketRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  return {
    isConnected,
    incomingMessage,
    sendMessage,
  };
};
