import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  message_type: 'DEMO_STATE_UPDATE' | 'LOG_EVENT' | 'AUDIT_TRAIL_ENTRY' | 'VOTE_UPDATE' | 'ERROR' | 'CONTEXT_SWITCH' | 'PONG';
  timestamp: number;
  payload: any;
}

export interface WebSocketHandlers {
  onDemoStateUpdate?: (payload: any) => void;
  onLogEvent?: (payload: any) => void;
  onAuditTrailEntry?: (payload: any) => void;
  onVoteUpdate?: (payload: any) => void;
  onError?: (payload: any) => void;
  onContextSwitch?: (payload: any) => void;
}

interface UseWebSocketOptions {
  url: string;
  handlers?: WebSocketHandlers;
  pingInterval?: number; // milliseconds, default 30000
  maxReconnectAttempts?: number; // default 5
}

export const useWebSocket = (options: UseWebSocketOptions | string) => {
  // Support both old string API and new options API for backwards compatibility
  const config = typeof options === 'string' 
    ? { url: options, pingInterval: 30000, maxReconnectAttempts: 5 }
    : { pingInterval: 30000, maxReconnectAttempts: 5, ...options };

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectAttempts = useRef(0);
  const handlersRef = useRef(config.handlers);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = config.handlers;
  }, [config.handlers]);

  const startPingInterval = useCallback(() => {
    // Clear existing interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Start health check ping every 30 seconds
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
      }
    }, config.pingInterval);
  }, [config.pingInterval]);

  const stopPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = undefined;
    }
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    const handlers = handlersRef.current;
    if (!handlers) return;

    switch (message.message_type) {
      case 'DEMO_STATE_UPDATE':
        handlers.onDemoStateUpdate?.(message.payload);
        break;
      case 'LOG_EVENT':
        handlers.onLogEvent?.(message.payload);
        break;
      case 'AUDIT_TRAIL_ENTRY':
        handlers.onAuditTrailEntry?.(message.payload);
        break;
      case 'VOTE_UPDATE':
        handlers.onVoteUpdate?.(message.payload);
        break;
      case 'ERROR':
        handlers.onError?.(message.payload);
        break;
      case 'CONTEXT_SWITCH':
        handlers.onContextSwitch?.(message.payload);
        break;
      case 'PONG':
        // Health check response received
        break;
      default:
        console.warn('Unknown message type:', message.message_type);
    }
  }, []);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(config.url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        startPingInterval();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        stopPingInterval();
        
        // Attempt reconnection with exponential backoff (up to 5 attempts)
        if (reconnectAttempts.current < config.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${config.maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setConnectionError(`Failed to connect after ${config.maxReconnectAttempts} attempts`);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [config.url, config.maxReconnectAttempts, startPingInterval, stopPingInterval, handleMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopPingInterval();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, stopPingInterval]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected, message not sent:', message);
    }
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    setConnectionError(null);
    connect();
  }, [connect]);

  return { 
    isConnected, 
    lastMessage, 
    sendMessage, 
    connectionError,
    reconnect,
    reconnectAttempts: reconnectAttempts.current
  };
};
