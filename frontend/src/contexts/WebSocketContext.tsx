import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  TACTEvaluationResult, 
  GuardrailsQueryResult, 
  TrustScoreResult, 
  ApprovalWorkflowState,
  AuditTrailEntry 
} from '../types';

interface WebSocketContextValue {
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
  reconnectAttempts: number;
  sendMessage: (message: any) => void;
  
  // Demo state
  demo1State: TACTEvaluationResult | null;
  demo2State: GuardrailsQueryResult | null;
  demo3State: TrustScoreResult | null;
  demo4State: ApprovalWorkflowState | null;
  
  // Logs and audit trail
  logs: LogEvent[];
  auditTrail: AuditTrailEntry[];
  
  // Votes
  voteCount: { approve: number; deny: number };
  
  // Error banner
  errorMessage: string | null;
  clearError: () => void;
}

interface LogEvent {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  source: string;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  url = 'wss://9vxbth7hj2.execute-api.us-west-2.amazonaws.com/staging'
}) => {
  const [demo1State, setDemo1State] = useState<TACTEvaluationResult | null>(null);
  const [demo2State, setDemo2State] = useState<GuardrailsQueryResult | null>(null);
  const [demo3State, setDemo3State] = useState<TrustScoreResult | null>(null);
  const [demo4State, setDemo4State] = useState<ApprovalWorkflowState | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [voteCount, setVoteCount] = useState({ approve: 0, deny: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDemoStateUpdate = useCallback((payload: any) => {
    const { demo_id, state } = payload;
    
    switch (demo_id) {
      case 1:
        setDemo1State(state);
        break;
      case 2:
        setDemo2State(state);
        break;
      case 3:
        setDemo3State(state);
        break;
      case 4:
        setDemo4State(state);
        break;
      default:
        console.warn('Unknown demo_id:', demo_id);
    }
  }, []);

  const handleLogEvent = useCallback((payload: any) => {
    const logEvent: LogEvent = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: payload.timestamp || Date.now(),
      level: payload.level || 'INFO',
      message: payload.message,
      source: payload.source || 'unknown'
    };
    
    setLogs(prev => {
      const newLogs = [...prev, logEvent];
      // Keep only last 1000 logs to prevent memory issues
      return newLogs.slice(-1000);
    });
  }, []);

  const handleAuditTrailEntry = useCallback((payload: AuditTrailEntry) => {
    setAuditTrail(prev => {
      const newTrail = [...prev, payload];
      // Keep only last 500 entries
      return newTrail.slice(-500);
    });
  }, []);

  const handleVoteUpdate = useCallback((payload: any) => {
    setVoteCount({
      approve: payload.approve || 0,
      deny: payload.deny || 0
    });
  }, []);

  const handleError = useCallback((payload: any) => {
    setErrorMessage(payload.message || 'An error occurred');
    
    // Auto-clear error after 10 seconds
    setTimeout(() => {
      setErrorMessage(null);
    }, 10000);
  }, []);

  const handleContextSwitch = useCallback((payload: any) => {
    // Context switch updates all demos
    // This is handled by the IndustryContext, but we can clear states here
    console.log('Context switch detected:', payload);
    
    // Optionally clear demo states on context switch
    if (payload.clear_states) {
      setDemo1State(null);
      setDemo2State(null);
      setDemo3State(null);
      setDemo4State(null);
    }
  }, []);

  const { isConnected, sendMessage, connectionError, reconnect, reconnectAttempts } = useWebSocket({
    url,
    handlers: {
      onDemoStateUpdate: handleDemoStateUpdate,
      onLogEvent: handleLogEvent,
      onAuditTrailEntry: handleAuditTrailEntry,
      onVoteUpdate: handleVoteUpdate,
      onError: handleError,
      onContextSwitch: handleContextSwitch
    }
  });

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const value: WebSocketContextValue = {
    isConnected,
    connectionError,
    reconnect,
    reconnectAttempts,
    sendMessage,
    demo1State,
    demo2State,
    demo3State,
    demo4State,
    logs,
    auditTrail,
    voteCount,
    errorMessage,
    clearError
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
